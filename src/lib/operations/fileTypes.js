/**
 * File Type System — هر نوع عملیات یک "پسوند فایل" دارد
 * مثل سیستم‌عامل: .trj برای ترجمه، .vry برای ویرایش و ...
 */

export const FILE_TYPES = {
  translation: {
    id: 'translation',
    extension: '.trj',
    label: 'سند ترجمه',
    labelEn: 'Translation',
    icon: 'languages',
    color: 'blue',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    description: 'ترجمه متن از یک زبان به زبان دیگر با هوش مصنوعی'
  },
  editorial: {
    id: 'editorial',
    extension: '.vry',
    label: 'سند ویرایش',
    labelEn: 'Editorial',
    icon: 'pencil-line',
    color: 'violet',
    bgClass: 'bg-violet-100 dark:bg-violet-900/30',
    textClass: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-200 dark:border-violet-800',
    badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    description: 'ویرایش، تصحیح و بهبود متن با هوش مصنوعی'
  }
  // آینده:
  // glossary: { extension: '.gls', label: 'فرهنگ لغت', icon: 'book-open', color: 'green' }
  // summarize: { extension: '.smr', label: 'خلاصه‌سازی', icon: 'file-minus', color: 'amber' }
};

/**
 * Get file type definition for an operation type.
 * Falls back to translation if unknown.
 * @param {string} operationType
 */
export function getFileType(operationType) {
  return FILE_TYPES[operationType] || FILE_TYPES.translation;
}

/**
 * Get all defined file types as an array (for filter UI).
 */
export function getAllFileTypes() {
  return Object.values(FILE_TYPES);
}
