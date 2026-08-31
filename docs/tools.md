# ツールリファレンス

`skills/teacher-keaton/tools/` にあるツールの一覧。すべて `<specパス>` を先頭引数に取る。
**`<specパス>` を省略すると既定の `keaton/spec`** を使い、明示すればそちらを優先する。
Bunで実行する: `bun <skill-dir>/tools/<tool> [<specパス>] [オプション]`。

共通の前提: `<specパス>` はCUE(`*.cue`)とQuint(`*.qnt`)を含むディレクトリ。
ツールは `constants.qnt` 以外の単一の `.qnt` をモデルとして自動特定する。

## explain — 全部入り解説書

用語表・概念マップ・振る舞いの図を一つのMarkdownにまとめて出力する。
学習(オンボーディング)と分析の両方に使う。

```sh
bun tools/explain <spec>                       # 観測(ランダムトレース)
bun tools/explain <spec> --test <テスト名>      # 宣言(固定シナリオ)
bun tools/explain <spec> --all-tests           # 全シナリオを束ねる
bun tools/explain <spec> --output <パス>        # ファイルへ書く(成果物化)
bun tools/explain <spec> --seed <値>           # 再現性固定
bun tools/explain <spec> --max-steps <n>       # 探索ステップ数(既定12)
```

`--all-tests` は `.qnt` の `run <名前>Test` をすべて列挙し、テストごとの図を
`## 振る舞い` の下に `### <テスト名>` として束ねる。複数シナリオの成果物を
一度に作る場合に使う(`--test` とは同時指定できない)。

ビューは**適応型**。CUEの `glossary`/`relations`、`projection.cue` の `message`/`transition`
の有無で判定し、合うものだけ出す。

## glossary — 用語表

CUEの `glossary`(用語→{id,種別,定義,任意で根拠})をMarkdown表で出す。
概念に `sources` が宣言されていれば根拠カラムが出る。

```sh
bun tools/glossary <spec>
```

## gen-mermaid-diagram — 概念マップ

CUEの `vocabulary` と `relations` からMermaidの `graph LR`(概念マップ)を生成する。
構造のビュー。トレースは不要。

```sh
bun tools/gen-mermaid-diagram <spec>
```

## project — 振る舞いの図

`projection.cue` とQuintのトレースから振る舞いの図を生成する。

```sh
bun tools/project <spec>                        # 観測(ランダムトレース)
bun tools/project <spec> --test <テスト名>       # 宣言(固定シナリオ)
bun tools/project <spec> --trace <itfファイル>   # 任意のトレース(counterexample等)
bun tools/project <spec> --format <形式>        # 形式の指定
```

| 形式 | 内容 |
|---|---|
| `sequenceDiagram` | 参加者間のメッセージ(ナラティブ向き) |
| `stateDiagram` | 状態間の遷移(状態機械向き) |
| `json` | 形式非依存のイベント列(投影の中間表現) |

`--format` 省略時は `projection.cue` の `format` を使う。

## gen-quint-constants — Quint定数の生成

CUEの `knownIds` から `constants.qnt` を生成する。Quintはこれを参照して
生文字列を避ける。`spec/` 内に `constants.qnt` を書く。

```sh
bun tools/gen-quint-constants <spec>
```

モジュール名はアプリのディレクトリ名からサニタイズして作る
(`todo-cli`→`TodoCliConstants`)。

## check-consistency — CUE↔Quint整合検査

```sh
bun tools/check-consistency <spec>
```

検査項目:
1. `.qnt` 内の文字列リテラルがCUEの `knownIds` に存在するか(未知idは失敗)
2. `.qnt` 内に日本語/生リテラルが無いか(用語の原本はCUE)
3. `constants.qnt` がCUEの `knownIds` と一致するか(鮮度)
4. `projection.cue` の `when` が参照するQuint変数が宣言済みか
   (変数名を間違えると「何も出ない図」になるため)
5. `projection.cue` の `event`/`from`/`to` がCUEの既知idか
   (図に出る語の原本は語彙。イベントも概念として宣言する)
6. 警告: `vocabulary.cue` の `quintExpected` に挙がっているがQuintで未使用の
   概念(モデルの穴)。リストに無い概念は構造・投影専用とみなし警告しない
   (`quintExpected` の未知idは失敗)

## verify — 不変条件の全件検証

```sh
bun tools/verify <spec> [--max-steps <n>]
```

`quint verify` は `--invariant(s)` を渡さないとdeadlockしか検査しない。
手作業で列挙すると1件落としても検知できない。このツールは `.qnt` から
不変条件をすべて抽出して `quint verify` へ渡し、検証対象一覧の正本を持つ。

- 抽出規則: 頂層(2スペースインデント)の `val <Name>: bool`
  - 補助の補題は `def` / `pure def` で書く(抽出されない)
- 報告: `定義N件 / 指定N件 / 検証成功N件`。失敗時は非ゼロ終了

## ライブラリ(`lib/`)

ツールが共有する純関数群。

| ファイル | 役割 |
|---|---|
| `projection.ts` | 差分述語の評価とイベント検出(形式非依存) |
| `render.ts` | イベント列を sequenceDiagram/stateDiagram/json へ描画 |
| `glossary.ts` | グロッサリーをMarkdown表へ |
| `quint.ts` | quint/cue の呼び出し・トレース生成の共有ヘルパ |
| `quint-constants.ts` | knownIds取得・モジュール名生成・定数ファイル生成 |

`diagram-gen-bun/` は概念マップ生成のライブラリ。
