---
name: teacher-keaton
description: "既存のコードベースを形式仕様モデル(構造はCUE、振る舞いはQuint)へリバースエンジニアリングし、整合したビュー(用語表・概念マップ・シーケンス図/状態遷移図)へ投影して、システムのメンタルモデルの構築と照合を支援する。既存システムの構造・振る舞いの理解・形式化・文書化、コードの仕様へのリバースエンジニアリング、『メンタルモデル』『セマンティック』なビューの要求があった場合に使う。グリーンフィールドの新機能実装や通常のコード編集には使わない。 / Reverse-engineer an existing codebase into a formal specification model (CUE for structure, Quint for behavior) and project it into consistent views — glossary, concept map, sequence/state diagrams — to build and reconcile a human's mental model. Use when the user wants to understand, formalize, or document an existing system's structure and behavior, or asks to reverse-engineer code into a specification, or wants a 'mental model' / 'semantic' view of a codebase. Do not use for greenfield feature implementation or ordinary code edits."
---

# Teacher Keaton

Teacher Keaton は、既存のコードベースを**形式仕様モデル**へ変換し、それを
**整合した複数のビュー**へ投影する。目的はコード生成ではなく、システムが何であり
どう振る舞うかの**メンタルモデルを構築し、照合する**ことである。

手法は**セマンティック・リバースエンジニアリング**:

```
実コード(事実源)
   |  リバースエンジニアリング
   v
形式モデル(Specification IR)
   |-- CUE   : 構造・語彙・関係   (静的)
   |-- Quint : 状態・遷移・不変条件(振る舞い)
   |  投影
   v
ビュー: 用語表 / 概念マップ / シーケンス図 / 状態遷移図
   |  照合
   v
人間のメンタルモデル  ← 突き合わせ、食い違いを見つけ、モデルを直して再投影
```

すべてのビューは同じCUE語彙とQuint振る舞いから派生するため、
用語と構造は**構造的に**どのビュー間でも一致する。

## 使う場面

次をしたいときに使う:
- 自分が書いていない(昔書いた)既存システムを理解・説明したい
- システムの構造と振る舞いを、検査可能な仕様へ形式化したい
- モデルと整合した用語表・概念マップ・振る舞い図を作りたい
- コードベースのメンタルモデルを築いてオンボーディングしたい

**使わない**場面: グリーンフィールドの新機能開発、リファクタ、通常のコード編集。

## 前提

ツールは3つのCLIが `PATH` に必要。まず確認し、無ければユーザーに導入を促す:

```sh
cue version       # CUE   (構造検証)   https://cuelang.org
quint --version   # Quint (振る舞い検証) https://quint-lang.org
bun --version     # Bun   (ツール実行)  https://bun.sh
```

どれかが無ければ止め、導入を依頼する。macOSでは次を案内する:

```sh
brew install cue-lang/tap-cue
brew install quint
curl -fsSL https://bun.sh/install | bash
```

macOS以外では、CUE・Quint・Bunを `PATH` から利用できるよう、ユーザーが好む方法で
セットアップするよう依頼する。

ツールはこのスキルの `tools/` ディレクトリにある。Bunで実行する:

```sh
bun <skill-dir>/tools/<tool> <specパス> [オプション]
```

`<specパス>` は、一つのシステムのCUE(`*.cue`)とQuint(`*.qnt`)を含むディレクトリ。
**既定は `keaton/spec`**(カレントディレクトリ基準)。Rubyの `spec/`(RSpec)など
各言語の慣習と衝突しないよう、専用の `keaton/` 名前空間を使う。ツールは
`<specパス>` を省略すると `keaton/spec` を使い、明示すればそちらを優先する。

```sh
bun <skill-dir>/tools/explain                    # 既定の keaton/spec を使う
bun <skill-dir>/tools/explain path/to/spec       # 明示的に指定
```

ソースリポジトリの `examples/` に2つの完成例がある
(`momotaro`=ナラティブ、`todo-cli`=状態機械)。

## 2つの層

| 層 | ツール | 答える問い | ファイル |
|---|---|---|---|
| 構造 | CUE | 何が存在し、どう繋がっているか | `schema.cue`, `vocabulary.cue`, `statuses.cue` 等 |
| 振る舞い | Quint | 何が起きえて、何が常に成り立つか | `<name>.qnt` |
| 投影 | `projection.cue` | 状態変化をどう意味づけるか | `projection.cue` |

**CUEが語彙の原本。** 各概念は安定idと表示名を持ち、Quintとすべての図は
CUEのid/名を参照し、独自に作り出さない。

## ワークフロー

次のフェーズを順に進める。モデルは**健全だが完全ではない**を保つ:
機械検査する価値のあるものだけ形式化し、根拠や曖昧な意図は散文のまま残す。

### 0. 理解対象を明確にする(スコープ合意)

**高コストな作業(調査・形式化・検証)に入る前に、必ず対象を絞る。**
「どこまでを・どの深さで・何のために」が曖昧なまま着手すると、期待と異なる成果物に
時間とクレジットを浪費する。良い質問で対象を明確化し、**理解計画**として合意してから
進める。これが「できた」の定義になり、収束性を担保する。

次の5軸を**1回の構造化された質問**で尋ねる(往復を増やさない):

| 軸 | 質問 | 決まること |
|---|---|---|
| **目的** | 何のために理解したいか(オンボーディング/デバッグ/レビュー/文書化) | 成果物の形(`explain`全部入りか、特定ビューか) |
| **範囲** | どこからどこまで(全体/特定モジュール/特定機能) | モデル化するコードの境界 |
| **深さ** | 構造だけか、振る舞い込みか、不変条件までか | CUEだけ書くかQuintまで書くか |
| **焦点** | 振る舞いの何を重視するか(主な遷移/特定の制約/データの流れ) | Quintモデルの中心 |
| **照合基準** | 何が「正しく理解できた」証拠か | 収束の判定基準 |

回答から**理解計画**を作り、ユーザーに提示して承認を得る:

```
【理解計画】
- 目的: <...>
- 範囲: <...>
- 深さ: <構造のみ | 振る舞い込み | 不変条件まで>
- 成果物: <explain | glossary | 概念マップ | project>
- 照合: <...>
→ この計画で進めてよいですか?
```

歯止め(過剰質問にしない):
- 自明な軸は省略してよい(「このモジュールの概要を見せて」なら目的・範囲が明白)
- ユーザーが答えられない軸は**推奨の既定を提案して確認**する形にする
- 「分からない」は有効な入力。その場合はまず浅い概観(用語表+概念マップ)を出し、
  そこから絞る(段階的な深掘り)

実行中に範囲変更が必要になったら、勝手に広げず**計画を再提示して再確認**する。

### 1. コードを調査する

**理解計画の承認後**に、計画で定めた範囲・深さに従ってコードを読み、
次を書き出しながら見立てる:
- **概念/エンティティ**: 名詞(例: Task, Character, Order)とその属性
- **状態**: エンティティが取りうる離散状態(例: タスクの `backlog/active/done`)
- **遷移**: 状態を変える操作と、その**ガード**(前提条件)
- **不変条件**: 常に成り立つべきこと(例: idは再利用しない; completedAtはdoneのみ)
- **関係**: 概念同士の繋がり(例: 「AがBへ支払う」「XがYを開始する」)

**観測事実**(コードが現にやること)と**意図の推測**(なぜそうするか)を区別する。
事実はモデルに書き、意図は散文として残す。

### 2. CUEで構造を書く

対象プロジェクトの `keaton/spec/` ディレクトリを作る(既定の出力先)。定義するもの:
- `schema.cue`: エンティティのスキーマ・enum・構造制約
  (必須フィールド・型・値の範囲)。コードが読込時に行う検証を写し取る
- ドメインファイル(例: `statuses.cue`): 各概念に `id`, `preferredName`,
  `definition`, `relations`
- `vocabulary.cue`: `vocabulary`(用語→{id,種別})、`glossary`(用語→{id,種別,定義})、
  `knownIds`、`relations`、参照整合性検査。`templates/` を出発点にする

検証: `cue vet -c <specパス>`。

### 3. Quintで振る舞いを書く

- `<name>.qnt` を書く: `var` 状態変数、`action init`、`action step`、
  遷移ごとのアクション(ガード付き)、`val` 不変条件。`run ...Test` シナリオも追加
- CUEのidに紐付ける定数を生成:
  `bun <skill-dir>/tools/gen-quint-constants <specパス>`。`constants.qnt` が書かれる。
  `<name>.qnt` では `import <Module>Constants.* from "./constants"` して
  その定数を使い、**生文字列は使わない**
- 検証:
  ```sh
  quint typecheck <specパス>/<name>.qnt
  quint test      <specパス>/<name>.qnt
  quint verify    <specパス>/<name>.qnt --invariant <A>,<B>,<C>   # 不変条件は明示列挙
  ```

### 4. 投影を書く

`projection.cue` を書く: 各意味のあるイベントについて、**どの状態変化がそれを
引き起こすか**と**どう描画するか**(参加者間の `message` か、状態間の `transition` か)
を宣言する。このファイルが、かつてツールにハードコードされていたドメイン解釈の
置き場所である。`docs/conventions.md` と `examples/*/spec/projection.cue` を参照。

### 5. 整合を検査する

```sh
bun <skill-dir>/tools/check-consistency <specパス>
```
Quintの文字列リテラルが既知のCUE idか、`.qnt` に日本語/生リテラルが漏れていないか、
`constants.qnt` が新鮮かを検査する。

### 6. 投影して照合する

```sh
bun <skill-dir>/tools/explain <specパス>            # 全部入り解説書(Markdown)
bun <skill-dir>/tools/explain <specパス> --test <テスト名>  # 特定シナリオ
```

個別のビュー:
```sh
bun <skill-dir>/tools/glossary            <specパス>   # 用語表(Markdown表)
bun <skill-dir>/tools/gen-mermaid-diagram <specパス>   # 概念マップ(Mermaid graph)
bun <skill-dir>/tools/project             <specパス>   # 振る舞い図(シーケンス/状態/json)
```

そして**照合する**: ビューを人間に示し、その理解や実際の挙動と突き合わせる。
食い違いは発見である。
実コードから正しいモデルが決まる場合はモデルを直し、人間のメンタルモデルが
不完全だった場合はビューが新しい理解を示す。
実コードだけでは意味が決まらない場合は、次の手順で人間の判断へ渡す。

### 各フェーズで食い違いまたは反証を見つけた場合

CUEとQuintが検査するのは、モデルへ入れた前提に対する整合性である。
検証を通すために語彙や制約を推測で補うと、誤った前提を形式手法が補強してしまう。

検証失敗、Quintの反証(counterexample)、または実コードとの食い違いを見つけたら、
次のように処理する:

1. 実コードと検証結果を追加調査し、モデルの誤りか、観測事実同士の食い違いかを分ける
2. 実コードから正しいモデルが一意に決まるなら、モデルを直して関連する検証をやり直す。
   この場合は `TODO.md` を作らない
3. 追加調査後も、一つの語彙または論理構造に決まらない場合は推測で解消しない。
   これを**未解決の食い違い**と呼ぶ
4. 未解決の食い違いを対象プロジェクトの `keaton/TODO.md` へ記録する
5. 未解決の食い違いに依存するモデルとビューを保留し、依存しない範囲だけを検証して出す。
   中心概念が未解決なら、それに依存する後続フェーズも止める

**未解決の食い違い**とは、追加調査後も実コードだけでは一つの語彙または論理構造へ
収束しない食い違いを指す。
同じ `preferredName` が複数の安定idを指す場合も、実コードに既存の区別がなければ
表示名を発明せず、未解決の食い違いとして扱う。

`TODO.md` は未解決の食い違いがある場合だけ作成または更新する。
既存ファイルがある場合は、他の未解決項目を上書きしない。
各項目には次を含める:

- 両立しない観測事実と、そのファイル位置
- CUEの検証失敗、Quintの反証、または再現コマンドと結果
- 両立しないと判断した理由
- 保留したモデルとビュー
- ユーザーに求める具体的な判断

各項目はレベル2見出し1つで表し、既存項目と同じ食い違いなら新規追加せず、
根拠と影響を更新する。
最終報告には `TODO.md` のパス、レベル2見出しを数えた未解決項目数、保留した範囲、
ユーザーに求める判断を必ず含め、対処を依頼する。
ユーザーの判断後にモデルを更新して影響範囲の検証と投影をやり直し、解決した項目を削除する。
未解決項目が0件になったら `TODO.md` 自体を削除する。

## 規約(必ず守る)

- **安定識別子**: 各概念に、改名しても変わらないid。種別接頭辞を付ける
  (`char-`, `item-`)。状態は状態名をidにしてよい
- **CUEが語彙の原本**: 表示名と定義はCUEに置く。Quintと図はCUEからラベルを
  解決し、名前をハードコードしない
- **Quintに生文字列を置かない**: `constants.qnt` を参照。`check-consistency` が強制
- **検証を通すために意味を発明しない**: 未解決の語彙と論理構造は `TODO.md` へ根拠付きで残す
- **適応型ビュー**: システムに合うビューだけ出す。ナラティブはシーケンス図、
  状態機械は状態図。4つを強制しない
- **投影は照合のため**であり装飾ではない。どのビューも人間が現実と
  突き合わせられるものであること

## ツールリファレンス

| ツール | 役割 |
|---|---|
| `explain` | 全部入り解説書: 用語表+概念マップ+振る舞い図を一つのMarkdownで |
| `glossary` | CUEの `glossary` から用語表(Markdown表) |
| `gen-mermaid-diagram` | CUEの語彙と関係から概念マップ(Mermaid `graph LR`) |
| `project` | `projection.cue`+Quintトレースから振る舞い図(`--format sequenceDiagram\|stateDiagram\|json`) |
| `gen-quint-constants` | CUEの `knownIds` から `constants.qnt` を生成 |
| `check-consistency` | CUE↔Quintの語彙整合を検査 |

## 注意点

- `quint verify` は `--invariant A,B,C` を渡さないと**deadlockしか検査しない**。
  不変条件は必ず明示列挙する
- `quint test` は名前が `Test` で終わる `run` 定義だけ実行する(大文字小文字を区別)
- `gen-quint-constants` はモジュール名のハイフンをサニタイズする
  (`todo-cli` → `TodoCliConstants`)
- `project`/`explain` にはトレースが必要: 既定で `quint run`(観測)、
  `--test` で `quint test --match <名前>`。再現性には `--seed`
- モデルは**健全だが完全ではない**。すべてを形式化しようとせず、
  検査する価値のあるものを形式化し、残りは散文で残す
