# Specification: 決定論的YAML→JS変換システム

## Goal
YAML→JS変換を決定論的（非AI依存）にし、AIはYAML生成時のスキーマ検証・修正のみを担当することで、ワークフロー実行の再現性と信頼性を向上させる。

## User Stories
- 開発者として、同じYAMLから常に同じJSが生成されることで、デバッグと動作検証を容易にしたい
- 運用者として、YAML変更後もAI解釈のばらつきなく一貫した動作を期待したい

## Specific Requirements

**YAMLスキーマの厳密化**
- 現在の`workflow-template.yaml`を基に、JSON Schema形式で厳密なスキーマを定義
- 条件ロジックの構造化形式を導入: `when: { field: "...", op: "...", value: ... }`
- 演算子は `==`, `!=`, `>`, `<`, `>=`, `<=` をサポート
- 参照可能な変数: `extract.*`, `input.*`, `constants.*`
- 複数条件の場合は`match: all`（AND）または`match: any`（OR）を指定

**決定論的変換スクリプト（yaml-to-js.js）**
- Node.jsスクリプトとして`scripts/yaml-to-js.js`に配置
- YAMLを読み込み、スキーマ検証後にJSテンプレートを生成
- AI解釈なし: 純粋な機械的変換のみ
- 同一入力YAMLからは常に同一出力JSを保証
- `playwright_code`ブロックはそのまま出力にコピー

**スキーマ検証フロー**
- AIがYAML生成時にスキーマに対して検証を実行
- 検証失敗時はAIが自動修正（修正後に再検証）
- 変換スクリプトは検証済みYAMLのみを受け付け、無効な場合は明確なエラーで即座に失敗
- 実際にはAIが生成時に検証するため、変換時のエラーは発生しない想定

**変数補間の標準化**
- 単一形式に統一: `${extract.fieldName}`, `${input.paramName}`, `${constants.value}`
- テンプレートリテラル形式でJS出力に変換
- AIがYAML生成前に入力処理を担当するため、形式の一貫性を保証

**MCP browser_code互換性**
- 生成JSはMCP `browser_run_code`で実行可能
- Playwright Page APIを使用（両環境で共通）
- `__INPUT_DATA__`と`__CURRENT_FILE__`プレースホルダーを維持

**run-workflow.js互換性**
- 既存の`run-workflow.js`実行ロジックとの互換性を維持
- `generated/<workflow>.template.js`形式で出力
- プレースホルダー置換方式は変更なし

**条件ロジック（when句）の変換**
- YAML: `when: { field: "extract.amount", op: ">", value: 10000 }`
- JS: `if (extract.amount > 10000) { ... }` に機械的に変換
- 複数条件の場合は`match`の値に応じて`&&`または`||`で結合

**エラーハンドリング**
- スキーマ違反: 具体的なエラーメッセージ（違反箇所、期待値、実際の値）
- 変換エラー: ステップ番号と問題の詳細を出力
- フォールバックは実行フェーズで維持（本スペック範囲外）

**フォールバック構造の簡素化**
- `fallback.mode`フィールドを削除（未使用のため）
- `hint`をステップ直下に移動（`fallback`ネストを廃止）
- フォールバック時はステップの`name`と`hint`（任意）を使用してAIが要素を特定
- Before: `fallback: { mode: ai_search, hint: "検索ボックス" }`
- After: `hint: "検索ボックス"`（`name`は既存フィールドを使用）

## Visual Design
ビジュアル素材なし

## Existing Code to Leverage

**`references/workflow-template.yaml`（YAMLスキーマの基盤）**
- 現在のワークフロー構造を定義
- `input`, `extract`, `steps`, `verify`セクションの構造を参考
- `when`句の文字列形式を構造化形式に移行

**`references/code-template.js`（JSテンプレートの基盤）**
- `steps`配列とループ実行パターンを継承
- `__INPUT_DATA__`, `__CURRENT_FILE__`プレースホルダー方式を維持
- エラーハンドリングと結果返却の構造を踏襲

**`generated/amazon-product-search.template.js`（生成JSの参考例）**
- 実際の生成JSの構造を参考
- `execute`関数形式とステップメタデータ（name, action, selector, fallback）を維持
- `startFromStep`によるレジューム機能を保持

**`run-workflow.js`（実行ロジック）**
- テンプレート読み込みとプレースホルダー置換のパターンを維持
- `eval`によるコード実行方式との互換性を確保
- 結果オブジェクト形式（success, failedStep, etc.）を踏襲

**`rpa-execute/SKILL.md`（キャッシュ機構）**
- `meta.json`によるキャッシュ判定ロジックを参考
- `yamlHash`によるキャッシュ無効化トリガーを維持
- 変換スクリプトはキャッシュ生成の一部として組み込み

## Out of Scope
- 実行フェーズのロジック変更（自動修復、学習レポートは既存のまま維持）
- MCPフォールバック動作の変更
- `browser_run_code`実行エンジンの変更
- 新しいアクションタイプの追加
- YAMLの後方互換性対応（新形式に移行）
- GUI/ビジュアルエディタの作成
- スキーマのバージョニング機構
- 変換スクリプトの国際化（i18n）
- パフォーマンス最適化（現状の変換速度で十分）
- 変換中のAI解釈（明示的に削除対象）
