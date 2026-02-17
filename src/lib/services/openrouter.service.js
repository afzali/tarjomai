import { usageService } from './usage.service.js';

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
            temperature: options.temperature ?? 0,
            max_tokens: options.max_tokens ?? 4096,
            seed: options.seed ?? 42,
            top_p: options.top_p ?? 1
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
        
        // ذخیره مصرف در تاریخچه محلی
        if (data.usage) {
          try {
            await usageService.addUsage({
              model,
              usage: data.usage,
              projectId: options.projectId || null
            });
          } catch (e) {
            // خطای ذخیره مصرف نباید عملکرد اصلی را متوقف کند
          }
        }
        
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
          temperature: options.temperature ?? 0,
          max_tokens: options.max_tokens ?? 4096,
          seed: options.seed ?? 42,
          top_p: options.top_p ?? 1,
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
  },

  async getCredits(apiKey) {
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/credits`, {
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
      
      const data = await response.json();
      return {
        success: true,
        totalCredits: data.data?.total_credits || 0,
        totalUsage: data.data?.total_usage || 0,
        remaining: (data.data?.total_credits || 0) - (data.data?.total_usage || 0)
      };
    } catch (error) {
      return { success: false, error: 'خطا در دریافت اطلاعات اعتبار' };
    }
  },

  async getActivity(apiKey, date = null) {
    try {
      let url = `${OPENROUTER_API_URL}/activity`;
      if (date) {
        url += `?date=${date}`;
      }
      
      const response = await fetch(url, {
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
        if (response.status === 403) {
          return { success: false, error: 'این قابلیت فقط با Provisioning Key کار می‌کند. برای دیدن ریز مصرف به داشبورد OpenRouter مراجعه کنید.' };
        }
        return { success: false, error: `خطا: ${response.status}` };
      }
      
      const data = await response.json();
      return {
        success: true,
        activity: data.data || []
      };
    } catch (error) {
      return { success: false, error: 'خطا در دریافت تاریخچه مصرف' };
    }
  }
};

export default openrouterService;
