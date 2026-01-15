#!/usr/bin/env node
/**
 * Workflow Runner
 *
 * Usage:
 *   node run-workflow.js <workflow-name> <receipt-path> [options]
 *
 * Example:
 *   node run-workflow.js myte-expense-entertainment "C:\receipts\receipt.jpg"
 *   node run-workflow.js myte-expense-entertainment "C:\receipts" --charge-code CKFEV001
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function showWorkflowHelp(workflowName) {
  const yamlPath = path.join(__dirname, 'workflows', `${workflowName}.yaml`);

  if (!fs.existsSync(yamlPath)) {
    // ワークフロー一覧を表示
    const workflowsDir = path.join(__dirname, 'workflows');
    if (fs.existsSync(workflowsDir)) {
      const workflows = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.yaml'))
        .map(f => f.replace('.yaml', ''));
      console.log('\n利用可能なワークフロー:');
      workflows.forEach(w => console.log(`  - ${w}`));
      console.log('\n使用方法: node run-workflow.js <workflow-name> --help');
    }
    if (workflowName) {
      console.error(`\nワークフロー "${workflowName}" が見つかりません`);
    }
    process.exit(1);
  }

  const workflow = yaml.load(fs.readFileSync(yamlPath, 'utf8'));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${workflow.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\n${workflow.description}\n`);

  // 固定値
  if (workflow.constants) {
    console.log('📌 固定値 (constants):');
    for (const [key, value] of Object.entries(workflow.constants)) {
      console.log(`  ${key}: "${value}"`);
    }
    console.log();
  }

  // CSVフィールド一覧を構築 (YAMLから動的生成)
  const csvFields = [];
  const sampleRow1 = [];
  const sampleRow2 = [];

  // input セクションからフィールド追加
  if (workflow.input) {
    for (const [key, param] of Object.entries(workflow.input)) {
      csvFields.push({ name: key, desc: param.description });
      if (param.type && param.type.includes('image')) {
        sampleRow1.push('C:\\path\\file1.jpg');
        sampleRow2.push('C:\\path\\file2.jpg');
      } else if (param.default) {
        sampleRow1.push(param.default);
        sampleRow2.push(param.default);
      } else {
        sampleRow1.push('value1');
        sampleRow2.push('value2');
      }
    }
  }

  // extract セクションからフィールド追加
  if (workflow.extract) {
    workflow.extract.forEach(e => {
      csvFields.push({ name: e.field, desc: e.prompt.split('\n')[0] });
      if (e.field.includes('amount')) {
        sampleRow1.push('5000');
        sampleRow2.push('8000');
      } else if (e.field.includes('date')) {
        sampleRow1.push('2025/01/04');
        sampleRow2.push('2025/01/05');
      } else {
        sampleRow1.push('Sample1');
        sampleRow2.push('Sample2');
      }
    });
  }

  // CLIオプション (共通)
  console.log('⚙️  CLIオプション:');
  console.log('  --extract-csv <file>   CSVファイルからデータ読み込み');
  console.log('  --max-retries <n>      リトライ回数 (デフォルト: 3)');
  console.log('  --start-from <step>    途中のステップから再開');
  console.log();

  // CSVフィールド説明
  if (csvFields.length > 0) {
    console.log('📋 CSVフィールド:');
    csvFields.forEach(f => {
      console.log(`  ${f.name}: ${f.desc}`);
    });
    console.log();
  }

  // 使用例
  console.log('💡 使用例:');
  console.log(`  node run-workflow.js ${workflowName} --extract-csv data.csv`);
  if (csvFields.length > 0) {
    console.log();
    console.log('  data.csv:');
    console.log(`    ${csvFields.map(f => f.name).join(',')}`);
    console.log(`    ${sampleRow1.join(',')}`);
    console.log(`    ${sampleRow2.join(',')}`);
  }
  console.log();

  // テンプレート状態
  const templatePath = path.join(__dirname, 'generated', `${workflowName}.template.js`);
  if (fs.existsSync(templatePath)) {
    console.log('✅ テンプレート生成済み: generated/' + workflowName + '.template.js');
  } else {
    console.log('⚠️  テンプレート未生成: Claude経由で一度実行してテンプレートを生成してください');
  }
  console.log();
}

async function runWorkflow(workflowName, inputPath, options = {}) {
  const templatePath = path.join(__dirname, 'generated', `${workflowName}.template.js`);

  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    console.error('Run the workflow with Claude first to generate the template.');
    process.exit(1);
  }

  // Read template
  const templateCode = fs.readFileSync(templatePath, 'utf8');

  // Launch browser
  console.log(`\n🚀 Running workflow: ${workflowName}`);
  console.log(`📁 Input: ${inputPath}`);
  console.log(`🔄 Max retries: ${options.maxRetries || MAX_RETRIES}\n`);

  // 共有ブラウザプロファイルを使用（.mcp.json と同じ）
  const userDataDir = path.join(__dirname, '.browser-profile');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ['--start-maximized'],
    viewport: null
  });

  const page = context.pages()[0] || await context.newPage();

  let startFromStep = options.startFromStep || 0;
  let retryCount = 0;
  const maxRetries = options.maxRetries || MAX_RETRIES;

  try {
    while (retryCount <= maxRetries) {
      // Build input data
      const inputData = {
        extract: options.extract || {},
        constants: options.constants || {
          reason: "External – Entertainment",
          number_of_attendees: "1",
          tax_purpose: "EM - Internal (10000yen or more) or All but Meal"
        },
        charge_code: options.chargeCode || "CKFEV001",
        startFromStep: startFromStep
      };

      // Replace placeholders
      const code = templateCode
        .replace('__INPUT_DATA__', JSON.stringify(inputData))
        .replace('__CURRENT_FILE__', JSON.stringify(inputPath));

      if (retryCount > 0) {
        console.log(`\n🔄 Retry ${retryCount}/${maxRetries} - Starting from step ${startFromStep}`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }

      // Execute the workflow function
      const workflowFn = eval(`(${code})`);
      const result = await workflowFn(page);

      if (result.success) {
        console.log('\n📋 Result:', JSON.stringify(result, null, 2));
        console.log('\n✅ Workflow completed successfully!');
        return result;
      }

      // Failed - check if we should retry
      console.log(`\n⚠️  Step ${result.failedStep} failed: ${result.stepName}`);
      console.log(`   Selector: ${result.selector}`);
      console.log(`   Error: ${result.error}`);

      retryCount++;
      if (retryCount <= maxRetries) {
        console.log(`\n🔄 Will retry the same step (${retryCount}/${maxRetries})...`);
        // Retry the same step (don't increment startFromStep)
      } else {
        console.log(`\n❌ Max retries exceeded.`);
        console.log(`💡 To resume manually: --start-from ${result.failedStep}`);
        console.log(`💡 For AI-assisted fallback, run via Claude.`);
        return result;
      }
    }
  } catch (error) {
    console.error('\n❌ Execution error:', error.message);
    throw error;
  } finally {
    if (options.closeBrowser) {
      await context.close();
    } else {
      // Keep browser open for inspection
      console.log('\n⏸️  Browser kept open for inspection. Press Ctrl+C to exit.');
      await new Promise(() => {}); // Keep alive
    }
  }
}

// CLI
const args = process.argv.slice(2);

// --help オプションの処理
if (args.includes('--help') || args.includes('-h')) {
  const workflowName = args.find(a => !a.startsWith('-'));
  showWorkflowHelp(workflowName);
  process.exit(0);
}

// ワークフロー一覧表示
if (args.length === 0 || args[0] === '--list') {
  showWorkflowHelp(null);
  process.exit(0);
}

// --extract-csv がある場合は input-path 省略可能
const hasExtractCsv = args.includes('--extract-csv');

if (args.length < 2 && !hasExtractCsv) {
  console.log(`
Usage: node run-workflow.js <workflow-name> <input-path> [options]
       node run-workflow.js <workflow-name> --extract-csv batch.csv  # 複数実行
       node run-workflow.js <workflow-name> --help
       node run-workflow.js --list

Options:
  --help, -h              ワークフロー別の詳細ヘルプを表示
  --extract-csv <file>    CSVファイルから抽出データを読み込み
  --charge-code <code>    Charge code (default: CKFEV001)
  --start-from <step>     Start from step number (for resume)
  --max-retries <n>       Max retry attempts per step (default: 3)

Note: 各ワークフローに必要なパラメータは --help で確認できます。
  `);
  process.exit(1);
}

const workflowName = args[0];
// args[1]がオプション(--で始まる)なら inputPath は省略されている
const inputPath = args[1] && !args[1].startsWith('--') ? args[1] : null;
const optionsStartIdx = inputPath ? 2 : 1;
const options = {};

for (let i = optionsStartIdx; i < args.length; i += 2) {
  switch (args[i]) {
    case '--charge-code':
      options.chargeCode = args[i + 1];
      break;
    case '--start-from':
      options.startFromStep = parseInt(args[i + 1], 10);
      break;
    case '--max-retries':
      options.maxRetries = parseInt(args[i + 1], 10);
      break;
    case '--extract':
      options.extract = JSON.parse(args[i + 1]);
      break;
    case '--extract-csv':
      // CSVファイルから読み込み (ヘッダー + データ行形式)
      const csvPath = args[i + 1];
      if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found: ${csvPath}`);
        process.exit(1);
      }
      const lines = fs.readFileSync(csvPath, 'utf8')
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'));

      const headers = lines[0].split(',').map(h => h.trim());
      options.extractRecords = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const record = {};
          headers.forEach((h, idx) => {
            record[h] = values[idx] || '';
          });
          return record;
        });
      break;
  }
}

// 複数レコードの場合はループ実行
if (options.extractRecords && options.extractRecords.length > 0) {
  (async () => {
    const total = options.extractRecords.length;
    console.log(`\n📦 ${total} 件を処理します\n`);

    for (let i = 0; i < total; i++) {
      const record = options.extractRecords[i];
      const isLast = i === total - 1;

      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📄 [${i + 1}/${total}]`);
      console.log(`${'─'.repeat(50)}`);

      try {
        await runWorkflow(workflowName, inputPath, {
          ...options,
          extract: record,
          closeBrowser: !isLast
        });
      } catch (err) {
        console.error(`❌ エラー: ${err.message}`);
        if (!isLast) console.log('次のレコードに進みます...\n');
      }
    }
  })();
} else {
  runWorkflow(workflowName, inputPath, options).catch(console.error);
}
