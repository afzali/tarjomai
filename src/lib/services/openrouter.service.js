import { usageService } from './usage.service.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

// Default cap for output tokens. OpenRouter pre-reserves credit based on
// max_tokens, so this is also the upper bound used when callers compute an
// adaptive value. Change it here only — everything else reads from this.
export const MAX_OUTPUT_TOKENS = 8000;

// Toggle verbose request/response logging in the browser console.
// Set window.__TARJOMAI_DEBUG__ = false in the console to silence it.
const DEBUG = true;

/** Rough token estimate: Persian/Arabic ≈ 1 token/char, Latin ≈ 1 token/4 chars. */
function estimateTokens(/** @type {string} */ text) {
  if (!text) return 0;
  const nonLatin = (text.match(/[^\x00-\x7F]/g) || []).length;
  const latin = text.length - nonLatin;
  return Math.round(nonLatin + latin / 4);
}

/** @param {string} model @param {any[]} messages @param {any} options */
function logRequest(model, messages, options) {
  if (!DEBUG || typeof window === 'undefined' || window.__TARJOMAI_DEBUG__ === false) return;
  try {
    let totalChars = 0;
    let totalTokens = 0;
    const parts = messages.map((m) => {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      const chars = content.length;
      const tokens = estimateTokens(content);
      totalChars += chars;
      totalTokens += tokens;
      return { role: m.role, chars, estTokens: tokens, preview: content.slice(0, 120) };
    });
    console.groupCollapsed(
      `%c[OpenRouter →] ${model}  |  ~${totalTokens} tok in  |  ${totalChars} chars  |  max_tokens=${options.max_tokens ?? MAX_OUTPUT_TOKENS}`,
      'color:#2563eb;font-weight:bold'
    );
    console.log('model:', model);
    console.log('options:', { temperature: options.temperature ?? 0, max_tokens: options.max_tokens ?? MAX_OUTPUT_TOKENS, seed: options.seed ?? 42, top_p: options.top_p ?? 1, reasoning: options.reasoning ?? { exclude: true } });
    console.log('estimated input tokens:', totalTokens, '| total chars:', totalChars);
    console.table(parts);
    for (const m of messages) {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      console.log(`%c--- ${m.role} (full) ---`, 'color:#64748b', `\n${content}`);
    }
    console.groupEnd();
  } catch { /* logging must never break the request */ }
}

/** @param {string} model @param {any} result @param {number} ms */
function logResponse(model, result, ms) {
  if (!DEBUG || typeof window === 'undefined' || window.__TARJOMAI_DEBUG__ === false) return;
  try {
    const content = result?.content || '';
    const usage = result?.usage;
    console.groupCollapsed(
      `%c[OpenRouter ←] ${model}  |  ${result?.success === false ? 'FAILED' : 'ok'}  |  ${Math.round(ms)}ms  |  ${content.length} chars out`,
      `color:${result?.success === false ? '#dc2626' : '#16a34a'};font-weight:bold`
    );
    if (result?.success === false) {
      console.log('error:', result.error);
    } else {
      console.log('finishReason:', result.finishReason, '| truncated:', result.truncated, '| empty:', result.empty);
      if (usage) console.log('ACTUAL usage from API:', usage);
      console.log('output chars:', content.length, '| est output tokens:', estimateTokens(content));
      console.log(`%c--- response (full) ---`, 'color:#64748b', `\n${content}`);
    }
    console.groupEnd();
  } catch { /* ignore */ }
}

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
    const signal = options.signal;

    logRequest(model, messages, options);
    const _t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (signal?.aborted) {
        return { success: false, error: 'لغو شده توسط کاربر', cancelled: true };
      }
      try {
        const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: 'POST',
          signal,
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
            max_tokens: options.max_tokens ?? MAX_OUTPUT_TOKENS,
            seed: options.seed ?? 42,
            top_p: options.top_p ?? 1,
            // For reasoning-capable models (Gemini Pro, o-series, R1, ...): by default
            // we exclude the chain-of-thought from the response so it never leaks into
            // the translation output. Callers can override via options.reasoning.
            reasoning: options.reasoning ?? { exclude: true }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          if (response.status === 401) {
            return { success: false, error: 'API Key نامعتبر است' };
          }

          if (response.status === 402) {
            // OpenRouter pre-reserves the maximum possible cost (based on max_tokens)
            // before running. With pricey models this reservation can exceed the
            // available balance even when the real cost would be tiny.
            const r402 = {
              success: false,
              error: 'اعتبار کافی برای این درخواست رزرو نشد (۴۰۲). موجودی OpenRouter را افزایش دهید یا مدل ارزان‌تری انتخاب کنید.'
            };
            if (DEBUG) console.warn('[OpenRouter 402] raw error from API:', errorData);
            logResponse(model, r402, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - _t0);
            return r402;
          }
          
          if (response.status === 429) {
            const waitTime = Math.pow(2, attempt) * 1000;
            await this.sleep(waitTime);
            continue;
          }
          
          const rErr = {
            success: false,
            error: errorData.error?.message || `خطا: ${response.status}`
          };
          logResponse(model, rErr, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - _t0);
          return rErr;
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
        
        const choice = data.choices?.[0];
        const finishReason = choice?.finish_reason || null;
        const msg = choice?.message || {};
        // Reasoning models put their final answer in content; reasoning (if any)
        // is returned separately and must NOT be mixed into the translation.
        const content = msg.content || '';
        const rOk = {
          success: true,
          content,
          reasoning: msg.reasoning || '',
          finishReason,
          // true when the model hit the token limit and the output is cut off
          truncated: finishReason === 'length',
          // true when there is no usable content (e.g. model spent the whole
          // budget on reasoning) — caller may want to retry with more tokens
          empty: !content.trim(),
          usage: data.usage
        };
        logResponse(model, rOk, (typeof performance !== 'undefined' ? performance.now() : Date.now()) - _t0);
        return rOk;
      } catch (error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'لغو شده توسط کاربر', cancelled: true };
        }
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
          max_tokens: options.max_tokens ?? MAX_OUTPUT_TOKENS,
          seed: options.seed ?? 42,
          top_p: options.top_p ?? 1,
          reasoning: options.reasoning ?? { exclude: true },
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
