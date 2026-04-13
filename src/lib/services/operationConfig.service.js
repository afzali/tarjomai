import db from '$lib/db/index.js';

export const operationConfigService = {
  async getConfig(projectId) {
    return await db.operationConfig.where('projectId').equals(projectId).first();
  },

  async saveConfig(projectId, configData) {
    // Convert Svelte 5 Proxy to plain object
    const plainData = JSON.parse(JSON.stringify(configData));
    const existing = await this.getConfig(projectId);

    const config = {
      ...plainData,
      projectId,
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      await db.operationConfig.update(existing.id, config);
      return { ...existing, ...config };
    } else {
      config.createdAt = new Date().toISOString();
      config.isPreset = false;
      const id = await db.operationConfig.add(config);
      return { ...config, id };
    }
  },

  async getPresets(operationType = null) {
    if (operationType) {
      return await db.presets.where('operationType').equals(operationType).sortBy('name');
    }
    return await db.presets.orderBy('name').toArray();
  },

  async savePreset(presetData) {
    const plainData = JSON.parse(JSON.stringify(presetData));
    const preset = {
      ...plainData,
      createdAt: new Date().toISOString()
    };
    const id = await db.presets.add(preset);
    return { ...preset, id };
  },

  async deletePreset(id) {
    await db.presets.delete(id);
  },

  async applyPreset(projectId, presetId) {
    const preset = await db.presets.get(presetId);
    if (!preset) return null;
    const { id: _id, createdAt: _c, ...presetConfig } = preset;
    return this.saveConfig(projectId, presetConfig);
  },

  async exportConfig(projectId) {
    const config = await this.getConfig(projectId);
    if (!config) return null;
    const { id: _id, projectId: _pid, ...exportData } = config;
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      config: exportData
    };
  },

  async importConfig(projectId, data) {
    if (!data.config && !data.rules) return null;
    // Support both new format (config) and old format (rules) for backward compat
    const configData = data.config || data.rules;
    const config = { ...configData };
    // Fix legacy tone field
    if (typeof config.tone === 'string') {
      config.tone = config.tone ? [config.tone] : ['formal'];
    } else if (config.tone !== undefined && (!Array.isArray(config.tone) || config.tone.length === 0)) {
      config.tone = ['formal'];
    }
    // Ensure operationType is set
    if (!config.operationType) {
      config.operationType = 'translation';
    }
    return this.saveConfig(projectId, config);
  },

  getDefaultTranslationConfig() {
    return {
      operationType: 'translation',
      name: 'Default',
      tone: ['formal'],
      sentenceStructure: 'standard',
      vocabularyLevel: 'medium',
      fidelity: 'medium',
      translationType: 'balanced',
      customRules: [],
      systemPrompt: ''
    };
  },

  getDefaultEditorialConfig() {
    return {
      operationType: 'editorial',
      name: 'Default',
      options: {
        normalizeUnicode: true,
        replaceHalfSpaces: false,
        fixSpelling: true,
        grammarCorrection: true,
        customInstructions: ''
      },
      systemPrompt: '',
      promptMode: 'auto',
      isPreset: false
    };
  },

  buildEditorialPrompt(options, targetLanguage = 'fa') {
    const langLabel = targetLanguage === 'fa' ? 'فارسی' : targetLanguage;
    let prompt = `شما یک ویراستار و مصحح حرفه‌ای هستید که روی متن ${langLabel} کار می‌کنید.\nوظیفه شما:\n`;

    const tasks = [];
    if (options.normalizeUnicode) {
      tasks.push('- نرمال‌سازی کاراکترهای یونیکد (مثلاً «ی» و «ک» عربی به فارسی)');
    }
    if (options.addHalfSpaces) {
      tasks.push('- اضافه کردن نیم‌فاصله‌های لازم بین پیشوند/پسوند و کلمه (مثلاً می‌رود، می‌شود، کتاب‌ها)');
    }
    if (options.replaceHalfSpaces) {
      tasks.push('- حذف نیم‌فاصله‌های اشتباه (جایی که نباید نیم‌فاصله باشد) و جایگزینی با فاصله معمولی');
    }
    if (options.fixSpelling) {
      tasks.push('- تصحیح غلط‌های املایی');
    }
    if (options.grammarCorrection) {
      tasks.push('- پیشنهاد تصحیح ساختار دستوری و نگارشی');
    }
    if (options.customInstructions) {
      tasks.push(`- ${options.customInstructions}`);
    }

    if (tasks.length === 0) {
      tasks.push('- بررسی و بهبود کیفیت متن');
    }

    prompt += tasks.join('\n');
    prompt += '\n\nمتن ویرایش‌شده را مستقیماً برگردانید، بدون توضیح اضافه.';
    return prompt;
  }
};

// Backward-compat alias: rulesService methods map to operationConfigService
export const rulesServiceCompat = {
  getRules: (projectId) => operationConfigService.getConfig(projectId),
  saveRules: (projectId, data) => operationConfigService.saveConfig(projectId, {
    ...data,
    operationType: data.operationType || 'translation'
  }),
  getPresets: () => operationConfigService.getPresets('translation'),
  savePreset: (data) => operationConfigService.savePreset({ ...data, operationType: 'translation' }),
  deletePreset: (id) => operationConfigService.deletePreset(id),
  applyPreset: (projectId, presetId) => operationConfigService.applyPreset(projectId, presetId),
  exportRules: (projectId) => operationConfigService.exportConfig(projectId),
  importRules: (projectId, data) => operationConfigService.importConfig(projectId, data),
  getDefaultRules: () => operationConfigService.getDefaultTranslationConfig()
};

export default operationConfigService;
