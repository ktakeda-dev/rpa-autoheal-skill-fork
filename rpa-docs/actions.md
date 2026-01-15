# アクション定義

YAMLで使用可能なアクションの定義。

---

## アクション一覧

| action | Playwright コード | セレクタ | 用途 |
|--------|------------------|---------|------|
| `navigate` | `page.goto(url)` | - | URL遷移 |
| `wait` | `page.waitForSelector(selector, { timeout })` | 必須 | 要素出現待機 |
| `click` | `page.click(selector)` | 必須 | クリック |
| `fill` | `page.fill(selector, value)` | 必須 | テキスト入力（actionabilityチェックあり） |
| `type` | `page.keyboard.type(value)` | 不要 | キーボード入力（フォーカス位置に入力） |
| `select` | `page.selectOption(selector, value)` | 必須 | ドロップダウン選択 |
| `file_upload` | `page.setInputFiles(selector, path)` | 必須 | ファイルアップロード |
| `playwright_code` | コードをそのまま埋め込む | - | 複雑な操作 |

---

## fill vs type

| 項目 | fill | type |
|------|------|------|
| セレクタ | 必須 | 不要 |
| 動作 | 要素をクリア → 値セット | フォーカス位置に1文字ずつ入力 |
| actionabilityチェック | あり（visible, enabled, editable） | なし |
| 用途 | 通常のテキスト入力 | ドロップダウン内検索ボックス等 |

**使い分け:**
- 通常は `fill` を使用
- `fill` で visible 判定に失敗する場合は `type` を使用

---

## 各アクションの詳細

### navigate

```yaml
- name: ページを開く
  action: navigate
  url: https://example.com
  wait: 3000  # 遷移後の待機時間（ms）
```

### wait

```yaml
- name: 要素の出現を待機
  action: wait
  selector: "#main-content"
  timeout: 5000  # タイムアウト（ms）
```

**ログイン待機の場合:**
```yaml
- name: ログイン完了を待機
  action: wait
  selector: "#user-menu"
  timeout: 120000
  requires_manual_login: true
  hint: "ログインしてください"
```

### click

```yaml
- name: ボタンをクリック
  action: click
  selector: "#submit-btn"
  wait: 500  # クリック後の待機時間（ms）
  hint: "送信ボタン"
```

### fill

```yaml
- name: テキストを入力
  action: fill
  selector: "input[name='email']"
  value: "{{extract.email}}"
  hint: "メールアドレス入力欄"
```

### type

```yaml
- name: 検索ボックスに入力
  action: type
  value: "{{extract.search_term}}"
  wait: 500
  hint: "ドロップダウンが開いた状態でキーボード入力"
```

**注意:** セレクタ不要。直前の `click` でフォーカスを当ててから使用。

### select

```yaml
- name: オプションを選択
  action: select
  selector: "select[name='country']"
  value: "JP"
```

### file_upload

```yaml
- name: ファイルをアップロード
  action: file_upload
  selector: "input[type='file']"
  file: "{{current_item}}"
  wait: 2000
```

### playwright_code

複雑なループ・条件分岐が必要な場合:

```yaml
- name: 複数行を処理
  action: playwright_code
  code: |
    for (const item of extract.items) {
      await page.fill('#input', item);
      await page.click('#add');
    }
  hint: "テーブルに行を追加"
```

**利用可能な変数:**
- `page` - Playwright Page オブジェクト
- `extract` - 抽出データ
- `input` - 入力パラメータ
- `constants` - YAML定義の定数
- `currentFile` - 現在処理中のファイルパス

---

## 条件分岐（when）

特定条件でのみステップを実行:

```yaml
- name: 高額時のみ実行
  action: fill
  selector: "#extra"
  value: "追加情報"
  when: "extract.amount > 10000"
```

**複数条件:**
```yaml
- name: 複合条件
  action: click
  selector: "#special"
  when:
    - "extract.amount > 10000"
    - "input.type == 'external'"
  match: all  # all | any
```

**使用可能な演算子:** `==`, `!=`, `>`, `<`, `>=`, `<=`
**参照可能:** `extract.*`, `input.*`, `constants.*`
