/**
 * Editorial Wizard Step Definitions
 * Used by WizardShell to render the step progress bar.
 */

export const editorialWizard = {
  default: [
    { id: 'options', label: 'گزینه‌های ویرایش', icon: 'settings-2', description: 'انتخاب نوع ویرایش‌های مورد نظر' },
    { id: 'prompt-review', label: 'دستورالعمل', icon: 'file-text', description: 'بررسی و تنظیم دستورالعمل نهایی' }
  ]
};

/**
 * Get editorial wizard steps.
 */
export function getEditorialWizardSteps() {
  return editorialWizard.default;
}

/**
 * Get current step index from step id.
 * @param {string} stepId
 */
export function getEditorialCurrentStepIndex(stepId) {
  return editorialWizard.default.findIndex(s => s.id === stepId);
}
