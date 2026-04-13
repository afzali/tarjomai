/**
 * Translation Wizard Step Definitions
 * Used by WizardShell to render the step progress bar.
 */

export const translationWizard = {
  guided: [
    { id: 'analyze', label: 'تحلیل سبک', icon: 'sparkles', description: 'تحلیل سبک نوشتاری متن مبدا' },
    { id: 'compare', label: 'مقایسه مدل‌ها', icon: 'git-compare', description: 'مقایسه نتایج مدل‌های مختلف' },
    { id: 'select-model', label: 'انتخاب مدل', icon: 'cpu', description: 'انتخاب مدل نهایی برای ترجمه' }
  ],
  quick: [
    { id: 'quick-setup', label: 'راه‌اندازی سریع', icon: 'zap', description: 'تنظیم سریع مدل و قوانین ترجمه' }
  ]
};

/**
 * Get the wizard steps for translation based on setup type.
 * @param {'guided'|'quick'} setupType
 */
export function getTranslationWizardSteps(setupType = 'guided') {
  return translationWizard[setupType] || translationWizard.guided;
}

/**
 * Get the current step index from a setupStep string.
 * @param {string} setupStep
 * @param {'guided'|'quick'} setupType
 */
export function getTranslationCurrentStepIndex(setupStep, setupType = 'guided') {
  const steps = getTranslationWizardSteps(setupType);
  return steps.findIndex(s => s.id === setupStep);
}
