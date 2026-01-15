# 将来検討: CDP経由で既存ブラウザに接続

## 背景

現在の構成では、Claude Code セッションをまたぐとブラウザのタブ状態が失われる。
CDP (Chrome DevTools Protocol) を使えば、既存のブラウザに接続してタブを引き継げる。

## 現状の問題

```
Claude Code 終了 → MCP 終了 → ブラウザ終了 → タブ消失
```

## CDP 接続方式

### 1. ブラウザをデバッグモードで起動（手動で一度だけ）

```bash
# Windows (Chrome)
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="./.browser-profile"

# Windows (Edge)
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir="./.browser-profile"
```

### 2. .mcp.json を変更

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--cdp-endpoint", "http://localhost:9222"
      ]
    }
  }
}
```

### 3. run-workflow.js も対応させる場合

```javascript
const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0] || await context.newPage();
```

## メリット

- セッションをまたいでもタブが残る
- ログイン状態だけでなく、開いているページも保持
- 手動操作とワークフロー実行を混在できる

## デメリット

- ブラウザを手動で起動する必要がある
- ブラウザを閉じると接続が切れる
- 複数プロジェクトで同じブラウザを共有すると混乱する可能性

## ポート番号

- 9222 は CDP のデフォルト慣例（固定ではない）
- 他のアプリと被る場合は別のポートを使用可能

## 参考

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Playwright CDP Connection](https://playwright.dev/docs/api/class-browsertype#browser-type-connect-over-cdp)
