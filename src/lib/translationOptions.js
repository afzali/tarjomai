/**
 * Centralized translation options used across all pages
 * to ensure consistency in analyze, rules, and quick-setup pages
 */

export const toneOptions = [
	{ value: 'formal', label: 'رسمی' },
	{ value: 'informal', label: 'غیررسمی' },
	{ value: 'literary', label: 'ادبی' },
	{ value: 'scientific', label: 'علمی' },
	{ value: 'conversational', label: 'محاوره‌ای' },
	{ value: 'religious', label: 'مذهبی' }
];

export const vocabularyOptions = [
	{ value: 'simple', label: 'ساده' },
	{ value: 'medium', label: 'متوسط' },
	{ value: 'advanced', label: 'پیشرفته' }
];

export const translationTypeOptions = [
	{ value: 'literal', label: 'تحت‌اللفظی' },
	{ value: 'balanced', label: 'متعادل' },
	{ value: 'free', label: 'آزاد' }
];

export const fidelityOptions = [
	{ value: 'low', label: 'کم' },
	{ value: 'medium', label: 'متوسط' },
	{ value: 'high', label: 'زیاد' },
	{ value: 'literal', label: 'تحت‌اللفظی' }
];

export const structureOptions = [
	{ value: 'short', label: 'کوتاه' },
	{ value: 'medium', label: 'متوسط' },
	{ value: 'long', label: 'بلند' },
	{ value: 'mixed', label: 'ترکیبی' }
];

/**
 * Get label for a given option value
 * @param {Array<{value: string, label: string}>} options - Array of option objects
 * @param {string} value - Value to find
 * @returns {string} Label or default text
 */
export function getOptionLabel(options, value) {
	return options.find(opt => opt.value === value)?.label ?? 'انتخاب';
}
