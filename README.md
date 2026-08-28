# teacher-keaton

> 実コードを事実源としてリバースエンジニアリングした形式モデルを介し、
> 人間が目的別にシステムの意味を理解するための**セマンティックインターフェース**。

teacher-keaton は、既存のコードベースを**形式仕様モデル**へ逆抽出し、それを
**整合した複数のビュー**(用語表・概念マップ・シーケンス図・状態遷移図)へ投影する
AIエージェントのスキルです。目的はコード生成ではなく、**メンタルモデルの構築と照合**です。

**長期β版**です。手法とツール群を実プロジェクトへの適用を通じて継続的に収束させます。

## 何をするか

```
実コード(事実源)
   |  リバースエンジニアリング
   v
形式モデル(Specification IR)
   |-- CUE   : 構造・語彙・関係   (静的に保証できること)
   |-- Quint : 状態・遷移・不変条件(時間とともに変化する振る舞い)
   |  投影
   v
ビュー: 用語表 / 概念マップ / シーケンス図 / 状態遷移図
   |  照合
   v
人間のメンタルモデル
```

すべてのビューは同じCUE語彙とQuint振る舞いから派生するため、
**用語と構造がビュー間で構造的に一致します**。

## インストール

[vercel-labs/skills](https://github.com/vercel-labs/skills) 経由で、主要エージェントの
スキルディレクトリに一発導入できます。

```sh
npx skills add aq2bq/teacher-keaton --skill teacher-keaton -g
```

ローカルから導入する場合はリポジトリをcloneして:

```sh
npx skills add ./teacher-keaton --skill teacher-keaton -g
```

### 前提

スキルが使う3つのCLIが必要です。

| ツール | 役割 | 導入例 |
|---|---|---|
| [CUE](https://cuelang.org) | 構造検証 | `brew install cue` |
| [Quint](https://quint-lang.org) | 振る舞い検証 | `brew install quint` |
| [Bun](https://bun.sh) | ツール実行 | `brew install bun` |

## クイックスタート

インストール後、エージェントに「このコードベースを形式化して」と頼むとスキルが起動します。
手動でツールを使う場合(リポジトリ内で):

```sh
# 全部入り解説書(用語表+概念マップ+振る舞いの図)を一つのMarkdownで
bun skills/teacher-keaton/tools/explain examples/todo-cli/spec --test reopenTaskTest

# 個別のビュー
bun skills/teacher-keaton/tools/glossary            examples/momotaro/spec
bun skills/teacher-keaton/tools/gen-mermaid-diagram examples/momotaro/spec
bun skills/teacher-keaton/tools/project             examples/momotaro/spec --test fullStoryTest
```

## リポジトリ構成

```
teacher-keaton/
├── README.md / CHANGELOG.md / LICENSE(MIT)
├── docs/                       # 設計思想・手法・規約・ツール(人間向け)
│   ├── philosophy.md           # セマンティックREの考え方
│   ├── method.md               # 逆抽出→モデル化→投影→照合の判断基準
│   ├── conventions.md          # specの構造・projection.cueの書き方
│   └── tools.md                # ツールリファレンス
├── skills/teacher-keaton/
│   ├── SKILL.md                # エージェントが読む手法の手順書
│   ├── tools/                  # Bunツール一式
│   └── templates/              # 新規プロジェクト用spec雛形
└── examples/                   # 手本
    ├── momotaro/               # ナラティブ(→シーケンス図)
    └── todo-cli/               # 状態機械(→状態遷移図)。実コード+形式モデル
```

## 2つの手本

| 手本 | 構造 | 投影 |
|---|---|---|
| `examples/momotaro` | ナラティブ(参加者間の相互作用) | 用語表+概念マップ+**シーケンス図** |
| `examples/todo-cli` | 状態機械(レコードの状態変化) | 用語表+概念マップ+**状態遷移図** |

ビューは**適応型**です。システムの構造に合うものだけを出し、4つを強制しません。

## ドキュメント

- **[哲学](docs/philosophy.md)** — なぜこの手法か。セマンティックインターフェースの構想。
- **[手法](docs/method.md)** — リバースエンジニアリングから照合までの判断基準。
- **[規約](docs/conventions.md)** — specの構造と `projection.cue` の書き方。
- **[ツール](docs/tools.md)** — ツールリファレンス。
- **[SKILL.md](skills/teacher-keaton/SKILL.md)** — エージェント向け手順書。

## 技術スタック

CUE(構造)・Quint(振る舞い)・Bun(ツール)で固定します。

## ライセンス

[MIT](LICENSE)
