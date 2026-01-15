---
name: rpa-explore
description: "ブラウザ自動化の探索モード。「探索モードで構築」「ワークフローを作成」「YAMLを改善」「修正して」と言われたら使用。"
---

# RPA 探索モード

対話的にブラウザを操作しながら、新しいワークフローYAMLを構築する。
既存YAMLの改善・修正もこのモードで行う。

---

## フロー概要

```mermaid
flowchart TD
    A[フェーズ1: 記録] --> B[フェーズ2: テスト]
    B --> C[フェーズ3: 改善]
    C -->|問題あり| B

    subgraph Phase1 [記録]
        A1[ユーザーの操作を実行しながら記録]
        A2[最後まで流したらYAMLに出力]
        A1 --> A2
    end

    subgraph Phase2 [テスト]
        B1[/rpa-execute で実行]
        B2[学びレポートを確認]
        B1 --> B2
    end

    subgraph Phase3 [改善]
        C1[学びレポートを基にYAML修正]
        C2[必要に応じて繰り返し]
        C1 --> C2
    end
```

---

## フェーズ1: 記録

### 手順

1. URLにアクセス（`browser_navigate`）
2. `browser_snapshot` でページ構造を取得
3. ユーザーの指示に従って操作を実行
4. 成功した操作をステップとして記録（メモリ内）
5. **最後まで一通り流したら、即座にYAMLファイルに出力**

### 対話の流れ

```
ユーザー: 「https://example.com のワークフローを探索モードで構築して」

Claude: browser_navigate で移動
        browser_snapshot でページ解析
        「ページを開きました。操作を指示してください」

ユーザー: 「ログインボタンをクリック」

Claude: browser_click で実行、ステップを記録
        「クリックしました。次は？」

ユーザー: 「メールを入力して、パスワード入力して、ログイン」

Claude: 各操作を実行、ステップを記録
        「完了しました。次は？」

ユーザー: 「ここまでで一旦終わり」

Claude: workflows/<name>.yaml に即座に出力
        「YAMLを出力しました。テストしますか？」
```

### YAML出力タイミング

以下のキーワードでYAML出力:
- 「ここまで」「一旦終わり」「完了」
- 「保存して」「YAML出力」
- 明示的なワークフロー名の指定

---

## フェーズ2: テスト

**重要: テストは `/rpa-execute` スキルで実行する。探索モードで直接テストしない。**

### 手順

1. ユーザーが「テストして」と言ったら `/rpa-execute` を呼び出す
2. 実行結果と学びレポートを確認
3. 問題があればフェーズ3（改善）へ

### テスト実行

```
ユーザー: 「テストして」

Claude: /rpa-execute スキルを呼び出す
        Skill tool: skill="rpa-execute", args="workflows/<name>.yaml --input '{...}'"

        実行完了後:
        「実行が完了しました。結果: [成功/失敗]
         学びレポート: learnings/<name>/YYYY-MM-DD.md」

        問題発生時:
        「ステップ3でフォールバックが発生しました。
         原因: セレクタが見つからない
         学びレポートに改善案を記載しました。修正しますか？」

ユーザー: 「修正して」
```

---

## フェーズ3: 改善

学びレポートやユーザー指示を基に、YAMLを改善する。

### トリガー

- テスト実行で問題が発生した
- 「学びレポートを基に修正して」
- 「〇〇の部分をこう変えて」
- 「前回のエラーを修正して」

### 手順

1. `learnings/<workflow名>/` から過去の学びを確認
2. 対象YAMLを読み込み
3. 改善点を特定
4. 差分形式で改善案を提示
5. 承認後、YAMLを更新
6. 再テストで確認

### 改善パターン

#### セレクタの修正

```yaml
# Before - 不安定なセレクタ
- name: 要素をクリック
  selector: "#dynamic-id-123"

# After - 安定したセレクタ
- name: 要素をクリック
  selector: "[aria-label*='Submit']"
  fallback:
    hint: "送信ボタン"
```

#### 条件分岐の追加（when）

学びレポートで「特定条件で追加入力が必要」と判明した場合:

```yaml
# 単一条件
- name: 高額時のみ追加入力
  action: fill
  selector: "input[name='extra']"
  value: "追加情報"
  when: "extract.amount > 10000"

# 複数条件（AND）
- name: 複合条件
  action: click
  selector: "#special-button"
  when:
    - "extract.amount > 10000"
    - "input.type == 'external'"
  match: all  # all（すべて満たす）| any（いずれか満たす）
```

**使える演算子:** `==`, `!=`, `>`, `<`, `>=`, `<=`
**参照可能:** `extract.*`, `input.*`, `constants.*`

### 問題と対応一覧

| 問題 | 対応 |
|------|------|
| セレクタが見つからない | 代替セレクタを探して更新 |
| タイミングの問題 | wait ステップを追加 |
| 値が間違っている | 抽出ロジックを修正 |
| ステップ不足 | 新しいステップを追加 |
| 条件によって処理が異なる | when 条件を追加 |
| 繰り返し処理が必要 | playwright_code に変換 |
| fill で visible 判定失敗 | type アクションに変更 |

→ アクション詳細は `rpa-docs/actions.md` を参照

---

## セレクタの特定（重要）

**高速実行で使えるCSSセレクタを取得する。**

### 取得方法

1. `browser_snapshot` で要素を特定（ref番号を取得）
2. `browser_evaluate` でDOMからCSSセレクタを取得

#### 単一要素のセレクタ取得

```javascript
// browser_evaluate で ref を指定して実際のセレクタを取得
// パラメータ: ref="e45", element="Expense dropdown"
(element) => {
  // IDがあればそれを使用（スペースや特殊文字がある場合は属性形式）
  if (element.id) {
    if (/[\s\/]/.test(element.id)) {
      return `[id='${element.id}']`;  // スペースや/を含むID
    }
    return `#${element.id}`;
  }

  // aria-labelがあれば使用（動的IDの代替として有効）
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    // 部分一致で安定性を確保
    const key = ariaLabel.split(':')[0];  // "Reason: Select" → "Reason"
    return `[aria-label*='${key}']`;
  }

  // data-testidがあればそれを使用
  if (element.dataset?.testid) {
    return `[data-testid="${element.dataset.testid}"]`;
  }

  // name属性があれば使用
  if (element.name) return `[name="${element.name}"]`;

  // クラス + タグで特定
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList).join('.');
  return classes ? `${tag}.${classes}` : tag;
}
```

#### 複数要素の一括取得

探索効率化のため、複数要素のセレクタを一度に取得：

```javascript
// browser_evaluate（ref指定なし、ページ全体で実行）
() => {
  const getSelector = (el) => {
    if (el.id) {
      return /[\s\/]/.test(el.id) ? `[id='${el.id}']` : `#${el.id}`;
    }
    const aria = el.getAttribute('aria-label');
    if (aria) return `[aria-label*='${aria.split(':')[0]}']`;
    if (el.name) return `[name="${el.name}"]`;
    return null;
  };

  // フォーム要素を収集
  const elements = document.querySelectorAll('input, select, button, [role="combobox"]');
  const results = {};
  elements.forEach((el, i) => {
    const sel = getSelector(el);
    if (sel) {
      const label = el.placeholder || el.textContent?.slice(0,30) || `element-${i}`;
      results[label] = sel;
    }
  });
  return results;
}
```

### セレクタ形式（優先順位）

高速実行（`browser_run_code`）で動作する形式のみ使用：

1. `#element-id` - ID（最も安定）
2. `[id='element id']` - スペースや特殊文字を含むID
3. `[aria-label*='Label']` - aria-label部分一致（動的IDの代替）
4. `[data-testid='...']` - テスト用ID
5. `[name='fieldName']` - name属性
6. `input[type='text']` - タグ + 属性
7. `button.submit-btn` - タグ + クラス

### ドロップダウン選択

ドロップダウンの選択肢は `:has-text()` を使用（Playwright拡張、`browser_run_code`で動作）：

```yaml
# ドロップダウンを開く
- action: click
  selector: "#expense-dropdown"

# 選択肢をクリック
- action: click
  selector: "li:has-text('Meals and Entertainment')"
```

### 使用禁止（高速実行で動作しない）

以下はPlaywright MCP専用のアクセシビリティロールで、`browser_run_code` では動作しない：

```yaml
# NG - MCP専用形式（アクセシビリティロール）
selector: "combobox[name='Select a Value']"
selector: "gridcell:has-text('Cell Text')"
selector: "textbox[name='Amount']"

# OK - 純粋なCSSセレクタ + Playwright拡張
selector: "#expense-dropdown"
selector: "[aria-label*='Reason']"
selector: "li:has-text('Option Text')"
```

---

## 複雑な操作（playwright_code）

ループ処理や複雑な条件分岐が必要な場合、`playwright_code` アクションを使用する。

### 使用ケース

- 複数の日付/行に同じ操作を繰り返す
- 動的に生成される要素への操作
- 条件に応じた分岐処理

### 記録方法

探索中に繰り返しパターンを発見したら、コードとして記録：

```yaml
- name: 平日のWorking Hoursを入力
  action: playwright_code
  code: |
    const weekdays = ['Mon, 01/05', 'Tue, 01/06', 'Wed, 01/07'];
    for (const day of weekdays) {
      const row = page.getByRole('row', { name: new RegExp(day) }).first();
      await row.getByLabel('Work Start Time hours').selectOption('09');
      await row.getByLabel('Work End Time hours').selectOption('18');
    }
  fallback:
    mode: ai_search
    hint: "Working Hoursダイアログ内で時間を入力"
```

### 利用可能なオブジェクト

- `page`: Playwright Page オブジェクト
- `extract`: 抽出済みデータ
- `input`: 入力パラメータ
- `constants`: YAML定義の定数

---

## ログイン待機ポイントの特定

認証が必要なサイトでは、探索中にログイン待機ポイントを特定してYAMLに記録する。

### 検出タイミング

1. **初回アクセス時**: ログインページにリダイレクトされた場合
2. **セッション切れ**: 操作中に認証エラーが発生した場合
3. **ユーザー申告**: 「ここでログインが必要」と言われた場合

### 記録方法

```yaml
- name: ログイン完了を待機
  action: wait
  selector: "#dashboard"        # ログイン後に表示される要素
  timeout: 120000               # 2分（手動ログイン用）
  hint: "ログイン後のダッシュボード"
  requires_manual_login: true   # 高速実行時の目印
```

---

## YAML構造

→ `references/workflow-template.yaml` を参照
