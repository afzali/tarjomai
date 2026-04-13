/**
 * Operation Registry — رجیستری تمام عملیات‌های قابل انجام روی متن
 * هر عملیات جدید فقط باید اینجا تعریف شود.
 */

export const OPERATIONS = {
  translation: {
    id: 'translation',
    label: 'ترجمه',
    labelEn: 'Translation',
    icon: 'languages',
    description: 'ترجمه متن از یک زبان به زبان دیگر با هوش مصنوعی',
    setupTypes: ['guided', 'quick'],
    /**
     * URL for the first wizard step after project creation.
     * @param {number} projectId
     * @param {'guided'|'quick'} setupType
     */
    wizardEntryUrl(projectId, setupType = 'guided') {
      if (setupType === 'quick') return `/projects/${projectId}/quick-setup`;
      return `/projects/${projectId}/analyze`;
    },
    /**
     * URL for the main workspace page.
     * @param {number} projectId
     */
    workspaceUrl(projectId) {
      return `/projects/${projectId}`;
    }
  },
  editorial: {
    id: 'editorial',
    label: 'ویرایش',
    labelEn: 'Editorial',
    icon: 'pencil-line',
    description: 'ویرایش، تصحیح و بهبود متن با هوش مصنوعی',
    setupTypes: ['default'],
    wizardEntryUrl(projectId, _setupType) {
      return `/projects/${projectId}/editorial-setup`;
    },
    workspaceUrl(projectId) {
      return `/projects/${projectId}/editorial`;
    }
  }
  // آینده:
  // glossary: { ... }
  // summarize: { ... }
};

/**
 * Get operation definition.
 * @param {string} operationType
 */
export function getOperation(operationType) {
  return OPERATIONS[operationType] || OPERATIONS.translation;
}

/**
 * All operations as array (for selection UI).
 */
export function getAllOperations() {
  return Object.values(OPERATIONS);
}
