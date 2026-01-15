# Tech Stack

## Core Technologies

### AI & Automation

| Component | Technology | Purpose |
|-----------|------------|---------|
| **AI Engine** | Claude Code with Skills | ワークフロー生成、失敗分析、リカバリ判断 |
| **Browser Automation** | Playwright | 高速・安定したブラウザ操作 |
| **AI-Browser Bridge** | Playwright MCP | 失敗時のスナップショット取得、状態理解、AIリカバリ |

### Language & Runtime

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Primary Language** | TypeScript | 型安全性、開発効率、Playwrightとの親和性 |
| **Runtime** | Node.js | JavaScript実行環境 |
| **Package Manager** | npm / yarn | 依存関係管理 |

### Workflow Definition

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Workflow Format** | YAML | 人間が読める宣言的ワークフロー定義 |
| **Schema Validation** | JSON Schema / Zod | YAMLスキーマの検証 |
| **Knowledge Store** | SKILL.md (Markdown) | Claudeへのドメイン知識定義 |

### Version Control & Collaboration

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Version Control** | Git | ワークフローとSkillの履歴管理 |
| **Repository** | GitHub | コード管理、Issue追跡 |

## Development Tools

### Testing & Quality

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Test Framework** | Vitest / Jest | ユニットテスト、統合テスト |
| **E2E Testing** | Playwright Test | ワークフロー実行のE2Eテスト |
| **Linting** | ESLint | コード品質チェック |
| **Formatting** | Prettier | コードフォーマット統一 |

### Build & Deployment

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Build Tool** | tsup / esbuild | TypeScriptビルド |
| **CI/CD** | GitHub Actions | 自動テスト、リリース |

## Architecture Patterns

### Execution Model

```
[自然言語] → [Claude] → [YAML] → [Code Generator] → [Playwright Code]
                                                            ↓
                                                    [高速決定論的実行]
                                                            ↓
                                                    [失敗検知] → [Playwright MCP] → [Claude] → [AIリカバリ]
                                                            ↓
                                                    [失敗分析] → [YAML自動修正]
```

### Key Design Principles

1. **ハイブリッド実行**: 通常時は AI 推論なしで高速実行、失敗時のみ AI 介入
2. **タスク分離**: メインコンテキストをクリーンに保ち、スケーラビリティを確保
3. **宣言的ワークフロー**: YAMLによる人間可読なワークフロー定義
4. **知識の永続化**: Skill + YAML を組織の知識資産として蓄積

## File Structure

```
project/
├── skills/
│   └── SKILL.md              # ドメイン知識定義
├── workflows/
│   └── *.yaml                # ワークフロー定義
├── src/
│   ├── parser/               # YAMLパーサー
│   ├── generator/            # Playwrightコード生成
│   ├── runtime/              # 実行エンジン
│   ├── recovery/             # AIリカバリ
│   └── analysis/             # 失敗分析
├── generated/                # 生成されたPlaywrightコード
├── logs/                     # 実行ログ
└── reports/                  # 失敗分析レポート
```

## Dependencies

### Production Dependencies

- `playwright` - ブラウザ自動化
- `yaml` - YAML パース
- `zod` - スキーマバリデーション
- `commander` - CLI構築

### Development Dependencies

- `typescript` - 型システム
- `vitest` - テストフレームワーク
- `eslint` - リンター
- `prettier` - フォーマッター
- `tsup` - ビルドツール
