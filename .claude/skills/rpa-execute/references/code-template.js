// Generated Code Template
// Placeholder: __INPUT_DATA__ will be replaced at runtime
// Placeholder: __CURRENT_FILE__ will be replaced with file path
//
// Action definitions: references/actions.md
//
// FALLBACK SUPPORT:
// - Each step is wrapped with name/selector info
// - On failure: returns failedStep index, stepName, selector
// - Resume: pass startFromStep in __INPUT_DATA__ to skip completed steps

async (page) => {
  // Input data injected at runtime
  const input = __INPUT_DATA__;
  const extract = input.extract || {};
  const constants = input.constants || {};
  const currentFile = __CURRENT_FILE__;
  const startFromStep = input.startFromStep || 0;

  // Steps array - each step has name, selector, hint, and action function
  const steps = [
    // === Generated Steps Start ===
    // Example:
    // { name: 'Expense Type ドロップダウンをクリック', selector: '#dropdown', hint: 'ドロップダウンメニュー', fn: async () => {
    //   await page.click('#dropdown');
    //   await page.waitForTimeout(500);
    // }},
    // === Generated Steps End ===
  ];

  // Execute steps from startFromStep
  for (let i = startFromStep; i < steps.length; i++) {
    const step = steps[i];
    try {
      console.log(`[Step ${i + 1}/${steps.length}] ${step.name}`);
      await step.fn();
    } catch (error) {
      return {
        success: false,
        failedStep: i,
        stepName: step.name,
        selector: step.selector,
        hint: step.hint || '',
        error: error.message,
        totalSteps: steps.length,
        remainingSteps: steps.length - i
      };
    }
  }

  return {
    success: true,
    completedSteps: steps.length - startFromStep,
    totalSteps: steps.length
  };
}
