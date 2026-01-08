const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export const openrouterService = {
  async testConnection(apiKey) {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Tarjomai'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: 'API Key نامعتبر است' };
        }
        return { success: false, error: `خطا: ${response.status}` };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'خطا در اتصال به سرور' };
    }
  },

  async getAvailableModels(apiKey) {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Tarjomai'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  },

  async sendMessage(apiKey, model, messages, options = {}) {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Tarjomai',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.max_tokens ?? 4096
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 401) {
            return { success: false, error: 'API Key نامعتبر است' };
          }
          
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 1000;
            await this.sleep(waitTime);
            continue;
          }
          
          return { 
            success: false, 
            error: errorData.error?.message || `خطا: ${response.status}` 
          };
        }

        const data = await response.json();
        return {
          success: true,
          content: data.choices?.[0]?.message?.content || '',
          usage: data.usage
        };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return { 
      success: false, 
      error: lastError?.message || 'خطا در ارسال درخواست' 
    };
  },

  async streamMessage(apiKey, model, messages, options = {}, onChunk) {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Tarjomai',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 4096,
          stream: true
        })
      });

      if (!response.ok) {
        return { success: false, error: `خطا: ${response.status}` };
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullContent += content;
              if (onChunk) onChunk(content, fullContent);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      return { success: true, content: fullContent };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

export default openrouterService;
