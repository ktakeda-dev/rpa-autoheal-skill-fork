---
name: rpa-execute
description: "ブラウザ自動化スキル。「ワークフローを実行」「.yamlを実行」「ブラウザ操作」「フォーム入力」「自動化」と言われたら必ずこのスキルを使用。"
---

# RPA 実行モード

YAMLからPlaywrightコードを生成し、`browser_run_code` で一括実行する。

---

## 重要: 実行はTaskに委譲する

**メインコンテキストで `browser_run_code` を直接実行しないこと。**

```
メインコンテキスト          Task (general-purpose)
─────────────────────────────────────────────────
1. YAML読み込み
2. OCRでデータ抽出
3. キャッシュ確認/生成
4. Taskを起動 ──────────→ 5. template.js読み込み
                          6. browser_run_code実行
                          7. 結果を返す
←─────────────────────────
8. 学びレポート作成
```

---

## 概要

| 項目 | 実行モード |
|------|----------|
| 実行方式 | Playwrightコード一括実行 |
| スナップショット | 基本不要（失敗時のみMCPで取得） |
| フォールバック | 失敗ステップのみMCP補助 → 途中再開 |
| トークン消費 | 最小限 |
| キャッシュ | あり（2回目以降は生成スキップ） |

---

## 実行フロー

### フェーズ1: 準備とキャッシュ生成（メインコンテキスト）

**重要: キャッシュ生成はメインコンテキストで完了させる。Taskには実行のみ委譲。**

1. `workflows/<name>.yaml` を読み込む
2. 入力ファイル・パラメータを確認、データ抽出（OCR等）
3. キャッシュ確認と生成:
   - `generated/<name>.meta.json` を読み込む
   - `yamlHash` と現在のYAMLのハッシュを比較
   - **キャッシュ無効の場合**: メインコンテキストで `template.js` と `meta.json` を生成・保存
4. 各入力ファイルに対してTaskで実行を起動（1件ずつ）

### フェーズ2: 実行（1件ごとにTask）

**repeat: true の場合、各ファイルに対して個別にTaskを起動する。**

```
// 1件目
Task(
  subagent_type: "general-purpose",
  description: "<workflow名> - 実行 (1/N)",
  prompt: `
    ## タスク: <workflow名> 実行

    ## 実行手順（キャッシュ済みテンプレート使用）
    1. generated/<workflow>.template.js を Read で読み込む
    2. __INPUT_DATA__ と __CURRENT_FILE__ を置換してコードを構築
    3. browser_run_code で実行
    4. 失敗時はMCPフォールバック

    ## 入力データ
    \`\`\`json
    {
      "extract": { ... },
      "constants": { ... },
      "startFromStep": 0
    }
    \`\`\`

    ## 現在のファイル
    __CURRENT_FILE__ = "<ファイルパス>"

    ## 完了後
    結果を報告（成功/失敗、フォールバックの有無）
  `
)

// 2件目以降も同様に個別Task
```

### フェーズ3: 学びレポート（メインコンテキスト）

全件完了後、メインコンテキストで学びレポートを作成:
- `learnings/<workflow名>/YYYY-MM-DD.md` に保存
- フォールバックが発生した場合は原因・対処・改善案を記録

**失敗時:** MCPフォールバック → `startFromStep` で再開 → 学びレポートにフォールバック内容を記録

---

## コード生成ルール

### 前提条件

**YAMLのセレクタは純粋なCSSセレクタであること。**

```yaml
# OK - CSSセレクタ + Playwright拡張
selector: "#expense-dropdown"
selector: "[aria-label*='Reason']"
selector: "li:has-text('Option Text')"

# NG - MCP専用（実行不可）
selector: "combobox[name='Select Value']"
selector: "textbox[name='Amount']"
```

### アクション定義

→ **`rpa-docs/actions.md` を参照**

使用可能なアクション: `navigate`, `wait`, `click`, `fill`, `type`, `select`, `file_upload`, `playwright_code`

---

## MCPフォールバック

基本は全ステップを一括実行し、失敗したステップのみMCPで補助。

```
browser_run_code (全ステップ試行)
  ✅ Step 0-2: 成功
  ❌ Step 3: タイムアウト
  return { failedStep: 3, selector: '...' }
        ↓
MCP補助 (失敗ステップのみ)
  browser_snapshot → browser_click
        ↓
browser_run_code (startFromStep: 4 で再開)
  ✅ Step 4-7: 成功
```

**フォールバック手順:**
1. `failedStep`、`selector`、`hint` を確認
2. `browser_snapshot` で状態確認
3. MCP (`browser_click` 等) で操作（`hint` を参考に要素を特定）
4. `startFromStep` を設定して再実行

**hint フィールド:**
YAMLの各ステップに `hint` を記載すると、フォールバック時にAIがスナップショットから要素を特定する手がかりになる。
```yaml
- name: 保存ボタンをクリック
  action: click
  selector: "#save-btn"
  hint: "画面右下の青い保存ボタン"
```

---

## キャッシュ機構

```
generated/
├── <workflow>.meta.json    # YAMLハッシュ（キャッシュ判定用）
└── <workflow>.template.js  # 生成済みコード（プレースホルダー付き）
```

### キャッシュ判定（メインコンテキストで実行）

```bash
# 1. YAMLのMD5ハッシュを計算
node -e "const crypto = require('crypto'); const fs = require('fs'); const yaml = fs.readFileSync('workflows/<workflow>.yaml', 'utf8'); console.log(crypto.createHash('md5').update(yaml).digest('hex'));"

# 2. meta.jsonのyamlHashと比較
# 一致 → キャッシュ有効（template.js をそのまま使用）
# 不一致 → キャッシュ無効（template.js と meta.json を再生成）
```

### 保存手順（キャッシュ無効時、メインコンテキストで実行）

**1. meta.json を作成:**
（テンプレート: `references/cache-meta.json`）
```json
{
  "workflow": "<workflow名>",
  "yamlHash": "<MD5ハッシュ（32文字の16進数）>",
  "generatedAt": "<ISO日時>",
  "version": "1.0",
  "stepsCount": <ステップ数>,
  "hasFileUpload": <true/false>,
  "hasManualLogin": <true/false>
}
```

**重要: `yamlHash` は必須。これがないとキャッシュ判定ができない。**

**2. template.js を作成:**
- `references/code-template.js` を参考に、YAMLのstepsをPlaywrightコードに変換
- プレースホルダーを残す:
  - `__INPUT_DATA__` → 実行時に `{ extract: {...}, constants: {...}, startFromStep: N }` に置換
  - `__CURRENT_FILE__` → 実行時にファイルパスに置換（文字列としてクォート）
- 各stepを `steps` 配列に追加

**3. Write で保存（メインコンテキスト）:**
```
Write("generated/<workflow>.template.js", templateCode)
Write("generated/<workflow>.meta.json", metaJson)
```

**4. その後、Taskで実行を起動**

→ テンプレート: `references/code-template.js`

---

## 学びレポートとYAML改善サイクル

### 目的

**最終目標: キャッシュスクリプトだけで全ステップが高速実行できるようにする**

フォールバックが発生した = YAMLに問題がある → 学びレポートで原因分析 → YAMLを修正 → キャッシュ再生成

```
実行 → フォールバック発生 → 学びレポート作成
                              ↓
                         原因分析・改善提案
                              ↓
                         YAMLを修正（探索モードで）
                              ↓
                         キャッシュ再生成（yamlHash変更で自動）
                              ↓
                         次回実行で検証
```

### 学びレポート

実行後は `learnings/<workflow名>/YYYY-MM-DD.md` に出力。

**対応状況フィールド:**
- `未対応` - まだYAMLに反映していない（次回実行時に同じ問題が再発する）
- `解決済み` - YAMLを修正した（次回は高速実行で成功するはず）
- `対応不要` - 一時的な問題、または仕様上MCP必須

→ テンプレート: `references/learning-report.md`

### フォールバック発生時の記録

```markdown
## フォールバック発生箇所

| ステップ | セレクタ | 原因 | 改善案 |
|---------|---------|------|--------|
| Step 5: Reason を選択 | `li:has-text('Home <-> ...')` | タイムアウト | wait を 1000ms に増加、セレクタを具体化 |

### 原因分析
- ドロップダウンの読み込みが遅かった
- セレクタが複数要素にマッチした

### YAMLへの改善提案（具体的なdiff形式で）
```yaml
# Before
- name: Reason を選択
  action: click
  selector: "li:has-text('Home <-> ...')"
  wait: 500

# After
- name: Reason を選択
  action: click
  selector: "[role='listbox'] li:has-text('Home <-> ...')"
  wait: 1000
```
```

### YAML修正フロー

**重要: YAMLは自動修正しない。ユーザーが学びレポートを確認し、修正指示を出す。**

1. 学びレポートに改善提案を具体的なdiff形式で記載
2. ユーザーが内容を確認
3. ユーザーから「修正して」等の指示があれば、**探索モード（`/rpa-explore`）** でYAMLを修正
4. YAML修正後、次回実行時にキャッシュが自動再生成される（yamlHashが変わるため）

---

## 実行例

```
ユーザー: 「myte-expense を実行して。領収書は receipt.jpg」

1. workflows/myte-expense.yaml を読み込む
2. キャッシュ確認（有効 → スキップ、無効 → コード生成）
3. 入力データ抽出（OCR等）
4. browser_run_code で実行
5. 失敗時 → MCPフォールバック → startFromStep で再開
6. 結果を報告、学びレポート出力
```
