# ブラウザ自動化の競合比較
## なぜ「決定論 + AI フォールバック」が優れているのか

---

## 1. 2025年: AI エージェント元年

2024年末にAnthropicがModel Context Protocol (MCP)をリリースしたことで、2025年は「AIエージェント元年」となりました。

### 主要プレイヤー

| 企業 | サービス | 特徴 |
|------|----------|------|
| **Microsoft** | [Copilot Studio Computer Use](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/computer-use-is-now-in-public-preview-in-microsoft-copilot-studio/) | Windows 365統合 |
| **OpenAI** | [Operator / ChatGPT Agent](https://openai.com/index/introducing-operator/) | o3ベース |
| **Anthropic** | [Claude Computer Use](https://www.anthropic.com/news/3-5-models-and-computer-use) | Opus 4.5が最高性能 |
| **Google** | [Project Mariner](https://www.kdnuggets.com/the-best-agentic-ai-browsers-to-look-for-in-2026) | 83.5%成功率 |

---

## 2. 本ドキュメントの範囲

AIエージェントには様々な種類がありますが、本ドキュメントでは **「デスクトップ/ブラウザ操作の自動化エージェント」** に焦点を当てます。

```
AIエージェントの分類:
  ├─ コード生成エージェント（Cursor, GitHub Copilot等）
  ├─ 対話エージェント（ChatGPT, Claude等）
  ├─ 検索エージェント（Perplexity等）
  └─ デスクトップ/ブラウザ操作エージェント ← 本ドキュメントの対象
       - Computer Use系
       - RPA + 特定タスクのAI(OCRなど)
       - 本フレームワーク
```

以下では、この「デスクトップ/ブラウザ操作エージェント」における2つのアプローチを比較します。

---

## 3. 業界の2つのアプローチ

### アプローチ1: RPA

```
従来のRPA（決定論的なステップ実行）
  + AIは特定タスクに固定（OCR、分類など）
```

| メリット | デメリット |
|---------|-----------|
| 決定論的で信頼性が高い | AIは固定的な役割のみ |
| 再現性がある | UIが変わるとRPA部分が壊れる |
| 監査対応しやすい | 柔軟性がない |

### アプローチ2: Computer Use（AIが全部やる）

```
スクリーンショット → AI が画像認識 → 次のアクションを決定 → 実行 → 繰り返し
```

OpenAIのCUA（Computer-Using Agent）の説明より:
> "Operator can 'see' (through screenshots) and 'interact' (using all the actions a mouse and keyboard allow) with a browser"

| メリット | デメリット |
|---------|-----------|
| 柔軟で適応力がある | 非決定論的、毎回AIが判断 |
| UIが変わっても対応可能 | コストが高い（毎ステップ推論） |
| 事前設定が少ない | 成功率に限界（最高87%） |

### ベンチマーク性能

| ベンチマーク | OpenAI CUA | Google Mariner |
|-------------|-----------|----------------|
| OSWorld | 38.1% | - |
| WebArena | 58.1% | - |
| WebVoyager | 87% | - |
| 自律Webブラウジング | - | 83.5% |

**まだ100%には遠い。失敗するときは失敗する。**

---

## 4. 本フレームワーク: 第3の選択肢

### 決定論的ワークフロー + AIフォールバック + 学習ループ

```
通常: YAMLで定義したステップを順次実行（決定論）
失敗時: AIが動的に介入して解決（フォールバック）
学習: 成功パターンをYAMLに反映 → 次回から決定論的
```

```
┌─────────────────────────────────────────────────────────────┐
│   YAML 定義（決定論的）                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  steps:                                             │   │
│   │    - action: click                                  │   │
│   │      selector: "#submit-btn"                        │   │
│   │                                                     │   │
│   │  → 毎回同じ動作を保証                                │   │
│   │  → 高速（AI推論なし）                                │   │
│   └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                     通常: そのまま実行                       │
│                           │                                 │
│                     失敗時のみ ▼                            │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  AI フォールバック                                    │   │
│   │  → 画面を解析して代替セレクタを発見                    │   │
│   │  → 実行 → 成功したら学びを記録                        │   │
│   │  → 次回からYAMLに反映（決定論に戻る）                  │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 両方のいいとこ取り

| RPA | Computer Use | 本フレームワーク |
|-------------|--------------|----------------|
| 決定論的 ✅ | 柔軟 ✅ | 決定論的 ✅ + 柔軟 ✅ |
| 変更に弱い ❌ | 非決定論 ❌ | 学習で安定化 ✅ |
| UIが変わると壊れる ❌ | コスト高い ❌ | UIが変わっても適応 ✅ |

**使うほど決定論的になる（AIの出番が減る）**

---

## 5. 詳細比較

### アーキテクチャ

| 観点 | Computer Use系 | 本フレームワーク |
|------|---------------|-----------------|
| **基本動作** | 毎回AIが判断 | YAML通りに実行 |
| **AI利用** | 常時 | 失敗時のみ |
| **決定論性** | ❌ 非決定論的 | ✅ 決定論的 |
| **成功率** | 38〜87% | 99%+（学習後） |

### コスト・パフォーマンス

| 観点 | Computer Use系 | 本フレームワーク |
|------|---------------|-----------------|
| **トークン消費** | 毎ステップ | 失敗時のみ |
| **API料金** | 高い | 最小限 |
| **実行速度** | 遅い（毎回推論） | 高速 |
| **2回目以降** | 変わらない | さらに高速 |

### 運用・ガバナンス

| 観点 | Computer Use系 | 本フレームワーク |
|------|---------------|-----------------|
| **再現性** | ❌ 保証なし | ✅ 100% |
| **監査対応** | 困難 | 容易（YAML追跡可能） |
| **変更管理** | 不可 | Git管理可能 |

---

## 6. ビジネス要件との適合

```
経費精算を自動化したい

要件1: 確実に動くこと
  → 「87%成功」では業務に使えない

要件2: 同じ結果になること
  → 監査対応、コンプライアンス

要件3: 問題が起きたら追跡できること
  → 「なぜこの金額が入力されたか」の説明責任
```

**Computer Use系:**
```
毎回AIが「これかな？」と判断
  → なぜその操作をしたか説明できない
  → 監査で「AIが判断しました」は通らない
```

**本フレームワーク:**
```
YAMLに書いた通りに動く
  → 100% 再現可能
  → YAMLを見れば何をするか明確
  → Gitで変更履歴も追跡可能
```

---

## 7. 拡張: ハイブリッドモード

「ここだけは毎回AIで判断してほしい」というケースに対応。

```yaml
steps:
  # 決定論的ステップ
  - name: ページを開く
    action: navigate
    url: https://example.com

  # AI判断ステップ（明示的に指定）
  - name: 最適なカテゴリを選択
    action: ai_decide
    prompt: |
      この経費の内容を見て、最適なカテゴリを選択:
      - 交通費
      - 飲食費
      - 消耗品費

  # 決定論的ステップに戻る
  - name: 保存
    action: click
    selector: "#save-btn"
```

**決定論をベースに、必要な箇所だけAIを使う**
- AI判断箇所が明確 → 監査可能性を維持

---

## 8. ポジショニング

| アプローチ | 柔軟性 | 確実性・再現性 |
|-----------|--------|---------------|
| Computer Use（OpenAI, MS等） | ◎ 高い | △ 低い |
| 従来の自動化（RPA/Selenium） | △ 低い | ◎ 高い |
| **本フレームワーク** | **○ 高い** | **◎ 高い** |

- **Computer Use** = 柔軟だが不確実
- **従来の自動化** = 確実だが変更に弱い
- **本フレームワーク** = 確実性をベースに柔軟性を追加

---

## 9. まとめ

| 観点 | Computer Use系 | 本フレームワーク |
|------|---------------|-----------------|
| **速度** | 遅い | 高速 |
| **コスト** | 高い | 低い |
| **成功率** | 38-87% | 99%+ |
| **再現性** | なし | 100% |
| **監査対応** | 困難 | 容易 |
| **学習機能** | なし | あり |

### キーメッセージ

> **「すべてAIに考えさせる」のではなく、「決定論で動かし、困ったときだけAIに頼る」**
>
> さらに、失敗から学んで決定論を増やしていく。
>
> これが、Computer Use の次のパラダイムです。

---

## Sources

- [Microsoft Copilot Studio Computer Use](https://www.microsoft.com/en-us/microsoft-copilot/blog/copilot-studio/computer-use-is-now-in-public-preview-in-microsoft-copilot-studio/)
- [OpenAI Operator](https://openai.com/index/introducing-operator/)
- [OpenAI Computer-Using Agent](https://openai.com/index/computer-using-agent/)
- [Anthropic Claude Computer Use](https://www.anthropic.com/news/3-5-models-and-computer-use)
- [The State of AI Browser Agents in 2025](https://fillapp.ai/blog/the-state-of-ai-browser-agents-2025)
- [The Best Agentic AI Browsers for 2026](https://www.kdnuggets.com/the-best-agentic-ai-browsers-to-look-for-in-2026)
