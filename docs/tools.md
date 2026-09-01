# ツールリファレンス

`skills/teacher-keaton/tools/` にあるツールの一覧。すべて `<specパス>` を先頭引数に取る。
**`<specパス>` を省略すると既定の `keaton/spec`** を使う。
既存モデルを明示すれば、そちらを入力として優先する。
Bunで実行する: `bun <skill-dir>/tools/<tool> [<specパス>] [オプション]`。

共通の前提: `<specパス>` はCUE(`*.cue`)とQuint(`*.qnt`)を含むディレクトリ。
ツールは `constants.qnt` 以外の単一の `.qnt` をモデルとして自動特定する。

## vet — CUE構造検証 + 境界条件の用例ハーネス

```sh
bun tools/vet <spec>
```

1. `cue vet -c .` をspecディレクトリをcwdにして実行する
   (CUE v0.17.1 では `cue vet -c <相対パス>`(`./` なし)がimport pathとして
   扱われて失敗するため、必ずこのラッパー経由で行う)
2. `positives/` の各用例をspecと合わせて検証し、**通過**することを確かめる
   (制約が厳しすぎないか)
3. `negatives/` の各用例をspecと合わせて検証し、**拒否**されることを確かめる
   (制約が緩すぎないか)

「正例N/N通過、負例N/N拒否」を報告し、期待と逆なら非ゼロ終了する。

`keaton/spec` を使う通常経路では、検査用コピーを `keaton/tmp/` に作り、
各用例の検査後に削除する。

## explain — 全部入り解説書

用語表・概念マップ・振る舞いの図を一つのMarkdownにまとめて出力する。
学習(オンボーディング)と分析の両方に使う。

```sh
bun tools/explain                              # keaton/explanation.mdへ保存
bun tools/explain <spec>                       # 観測(ランダムトレース)
bun tools/explain <spec> --test <テスト名>      # 宣言(固定シナリオ)
bun tools/explain <spec> --all-tests           # 全シナリオを束ねる
bun tools/explain <spec> --output keaton/explanation.md # 成果物ルートへ保存
bun tools/explain <spec> --seed <値>           # 再現性固定
bun tools/explain <spec> --max-steps <n>       # 探索ステップ数(既定12)
```

`keaton/spec` を使う場合、`--output` を省略しても `keaton/explanation.md` へ保存する。
`--output` で明示できる保存先も、実行場所の `keaton/` 配下に限る。
`examples/` など開発用の明示specパスを使い、`--output` を省略した場合は標準出力へ出す。

`--all-tests` は `.qnt` の `run <名前>Test` をすべて列挙し、テストごとの図を
`## 振る舞い` の下に `### <テスト名>` として束ねる。複数シナリオの成果物を
一度に作る場合に使う(`--test` とは同時指定できない)。

specに `about: {title, purpose, scope, exclusions}` があれば、題名と
`## 概要`(目的・対象範囲・除外範囲)を出力する(無ければディレクトリ名が題名)。
`tools/verify` が書き出した `verify-result.json` があれば、`## 検証` 節として
不変条件名・成否・到達深度を取り込む。これで解説書が単体で完結する。

ビューは**適応型**。CUEの `glossary`/`relations`、`projection.cue` の `message`/`transition`
の有無で判定し、合うものだけ出す。

## glossary — 用語表

CUEの `glossary`(用語→{id,種別,定義,任意で根拠})をMarkdown表で出す。
概念に `sources` が宣言されていれば根拠カラムが出る。

```sh
bun tools/glossary <spec>
```

## measures — 測度表

CUEの `measures`(測度→{範囲, 極性, 閾値, 超過時の意味, 極性の根拠})をMarkdown表で出す。
測度が宣言されていないspecでは何も出さない(終了コード0)。

```sh
bun tools/measures <spec>
```

極性は「大きいほど悪い(小さいほど良い)」のように**常に両方向**を書く。
片方向の表記は読み飛ばされ、名前の印象で向きを取り違える余地を残すため。
閾値も「3 以上が悪い側 → 要対応として扱う」と、どちら側が悪いかまで書き下す。

## gen-mermaid-diagram — 概念マップ

CUEの `vocabulary` と `relations` からMermaidの `graph LR`(概念マップ)を生成する。
構造のビュー。トレースは不要。

```sh
bun tools/gen-mermaid-diagram <spec>
```

ノードの選定: 関係を持つ概念と、投影も関係も参照しない孤立概念を描く。
**投影が参照する孤立概念(イベント等)は除外する** — それらの意味は振る舞いの図が
担うため、構造の図ではノイズになる。投影も関係も無い孤立概念は「関係の
書き漏れ」のシグナルとして、あえて残す。

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

測度の述語(`measureWorsens` / `measureImproves` / `measureEntersWorseSide` /
`measureEntersBetterSide`)を使う投影では、CUEの `measures` から極性を読み、
増加が悪化かどうかを解決する。極性が `neutral` / `unresolved` の測度は
向きを決められないため、評価時に失敗する(黙って何も出さない図にしない)。

`--format` 省略時は `projection.cue` の `format` を使う。

`keaton/spec` を使ってトレースを生成する場合、一時ファイルは `keaton/tmp/` に作り、
投影後に削除する。

## gen-quint-constants — Quint定数の生成

CUEの `knownIds` から `constants.qnt` を生成する。Quintはこれを参照して
生文字列を避ける。`spec/` 内に `constants.qnt` を書く。

`measures` が宣言されていれば、閾値の定数 `<閾値>At` と、極性から導出した
`<閾値>IsWorseSide(v)` / `<閾値>IsBetterSide(v)` も生成する。比較の向きは
極性が原本なので、Quint側で `>=` と `<=` を書き分けない。述語名が「その比較が
悪い側の検出か良い側の検出か」を残す。極性が `neutral` / `unresolved` の測度と、
整数でない閾値は述語を生成せず、生成しない理由をコメントで残す。

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
6. 測度(`measures` がある場合):
   - 測度・閾値のidがCUEの既知idか、`entersState` が既知idか
   - `quintVar` がQuintで宣言済みか
   - 閾値を**生の比較**(`v >= 3` / `v <= <閾値>At`)で書いていないか
     — 生成された述語を迂回すると、比較の向きが追えなくなるため失敗させる
   - 投影の測度述語が参照する測度・閾値が存在し、極性から向きを決められるか
   - 警告: 極性が `unresolved`(`TODO.md` へ回すべき状態)、範囲が空、
     閾値を持つのに極性が `neutral`
7. 警告: `vocabulary.cue` の `quintExpected` に挙がっているがQuintで未使用の
   概念(モデルの穴)。リストに無い概念は構造・投影専用とみなし警告しない
   (`quintExpected` の未知idは失敗)

## verify — 不変条件の全件検証

```sh
bun tools/verify <spec> [--depths 4,8,12] [--timeout <秒>] [--max-steps <n>]
```

`quint verify` は `--invariant(s)` を渡さないとdeadlockしか検査しない。
手作業で列挙すると1件落としても検知できない。このツールは `.qnt` から
不変条件をすべて抽出して `quint verify` へ渡し、検証対象一覧の正本を持つ。

- 抽出規則: 頂層(2スペースインデント)の `val <Name>: bool`
  - 補助の補題は `def` / `pure def` で書く(抽出されない)
- **段階探索**: 深度4→8→12の順に試し、1段ごとに時間上限(既定60秒)。
  検証コストは深度に対して掛け算で爆発しうるので、浅い深度から始めて
  到達した深度を必ず報告する。反証が出たら即停止。浅い深度でのタイムアウトは
  対象が拡散している徴候であり、スコープの絞り直しか抽象化の提案を利用者へ
  返す引き金にする
- **作業場の隔離**: Apalacheの `_apalache-out/` は `keaton/` の中
  (keaton/ が無いspecでは spec の中)に作られる。検証成功時は削除し、
  反証が見つかったときだけ保持して保存場所を報告する
- 報告: `定義N件 / 指定N件 / 検証成功N件 (探索深度 N)`。失敗時は非ゼロ終了
- 結果は `verify-result.json`(keaton/ の中、keaton/ が無いspecでは spec の中)
  へ機械可読形式で書き出され、`explain` が「検証」節として取り込む
- `--max-steps <n>` は段階探索をせず単一深度で検証する(従来互換)

## ライブラリ(`lib/`)

ツールが共有する純関数群。

| ファイル | 役割 |
|---|---|
| `projection.ts` | 差分述語の評価とイベント検出(形式非依存) |
| `render.ts` | イベント列を sequenceDiagram/stateDiagram/json へ描画 |
| `glossary.ts` | グロッサリーをMarkdown表へ |
| `measures.ts` | 測度の極性から比較の向きを導出し、測度表をMarkdownへ |
| `quint.ts` | quint/cue の呼び出し・トレース生成の共有ヘルパ |
| `quint-constants.ts` | knownIds取得・モジュール名生成・定数ファイル生成 |

`diagram-gen-bun/` は概念マップ生成のライブラリ。
`fixtures/measure-spec/` は測度つきspecの最小標本で、`measure-cli.test.ts` が
極性のミューテーション(反転させると用例が落ちる)と生の閾値比較の検出を回帰させる。
