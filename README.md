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
ビュー: 用語表 / 測度表 / 概念マップ / シーケンス図 / 状態遷移図
   |  照合
   v
人間のメンタルモデル
```

すべてのビューは同じCUE語彙とQuint振る舞いから派生するため、
**用語と構造がビュー間で構造的に一致します**。
形式モデルの検証結果は、結果に記載された探索深度まで不変条件の反証が見つからなかったことを
示します。教育・記録・遵守を含む現場運用の実効性を証明するものではありません。

検証や照合で、実コードだけでは一つの語彙または論理構造へ収束しない食い違いを
見つけた場合は、推測で形式モデルを通しません。
根拠を `keaton/TODO.md` に残し、保留した範囲と必要な判断をユーザーへ報告します。
原資料が運用をまだ決めていないだけで観測事実が両立する事項は
`about.operationalUndecided`、理解計画で扱わない事項は `about.exclusions` に分け、
`TODO.md`へ混ぜません。

用語表へ投影する全概念は、由来と1件以上の観測位置を持ちます。
原資料に直接ある概念と、観測事実を表現するためモデル上で追加した概念を区別し、
後者には追加理由も残すため、利用者は原資料とモデル作成者の導出を別々に監査できます。

スキルが作成または保持するファイルは、実行場所の `keaton/` に収めます。
形式モデルは `keaton/spec/`、照合用の解説書は `keaton/explanation.md`、
検証の詳細は `keaton/verify.log`、処理中だけ使うトレースと検査用コピーは
`keaton/tmp/` に置きます。

大きな概念マップは、`explain --focus <用語または概念id> --focus-depth <n>` で
中心概念から指定した辺数以内へ絞れます。オプション省略時は全体図を出します。

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

スキルが使う次の3つのCLIが必要です。

| ツール | 役割 |
|---|---|
| [CUE](https://cuelang.org) | 構造検証 |
| [Quint](https://quint-lang.org) | 振る舞い検証 |
| [Bun](https://bun.sh) | ツール実行 |

macOSでは次のコマンドで導入できます。

```sh
brew install cue-lang/tap-cue
brew install quint
curl -fsSL https://bun.sh/install | bash
```

macOS以外では、お好みの方法で3つのCLIをセットアップしてください。

## クイックスタート

インストール後、エージェントに「このコードベースを形式化して」と頼むとスキルが起動します。
手動でツールを使う場合(リポジトリ内で):

```sh
# 全部入り解説書(用語表+概念マップ+振る舞いの図)を一つのMarkdownで
bun skills/teacher-keaton/tools/explain examples/todo-cli/spec --test reopenTaskTest

# 個別のビュー
bun skills/teacher-keaton/tools/glossary            examples/momotaro/spec
bun skills/teacher-keaton/tools/measures            examples/momotaro/spec
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

ビューは**適応型**です。システムの構造に合うものだけを出し、すべてを強制しません。
数値尺度を宣言したシステムでは、**測度表**(範囲・極性・閾値・超過時の意味)も出ます。

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
