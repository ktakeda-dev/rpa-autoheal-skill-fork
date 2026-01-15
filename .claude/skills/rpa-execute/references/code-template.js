// Generated Code Template
// Placeholder: __INPUT_DATA__ will be replaced at runtime
//
// Action definitions: rpa-docs/actions.md
//
// FALLBACK SUPPORT:
// - Each step is wrapped with name/selector/hint info
// - On failure: returns failedStep with index, name, selector, hint, error
// - Resume: pass startFromStep in __INPUT_DATA__ to skip completed steps

async (page) => {
  // Input data injected at runtime
  const inputData = __INPUT_DATA__;
  const { extract = {}, constants = {}, input = {}, startFromStep = 0 } = inputData;

  // Steps array - each step has name, action, selector, hint, and execute function
  const steps = [
    // === Generated Steps Start ===
    // Example:
    // {
    //   name: 'Expense Type ドロップダウンをクリック',
    //   action: 'click',
    //   selector: '#dropdown',
    //   execute: async () => {
    //     await page.click('#dropdown');
    //   },
    //   hint: 'ドロップダウンメニュー'
    // },
    // === Generated Steps End ===
  ];

  // Results object
  const results = { success: true, completedSteps: [], failedStep: null, output: {} };

  // Execute steps from startFromStep
  for (let i = startFromStep; i < steps.length; i++) {
    const step = steps[i];
    try {
      console.log(`Step ${i}: ${step.name}...`);
      const stepResult = await step.execute();
      results.completedSteps.push({ index: i, name: step.name, success: true });

      if (step.output && stepResult !== undefined) {
        results.output[step.output] = stepResult;
      }
    } catch (error) {
      results.success = false;
      results.failedStep = {
        index: i,
        name: step.name,
        selector: step.selector,
        hint: step.hint,
        error: error.message
      };
      break;
    }
  }

  return results;
}
