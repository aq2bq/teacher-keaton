# Changelog

teacher-keaton は長期β版です。セマンティック・リバースエンジニアリングの手法と
ツール群を、実プロジェクトへの適用を通じて継続的に収束させます。

形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に倣い、
バージョンは [Semantic Versioning](https://semver.org/lang/ja/) に従います。
1.0.0 未満は破壊的変更を伴いうるβ版とします。

## [0.1.0] - 未リリース

### Added

- 初期骨格: リポジトリ構造、README、MIT LICENSE
- セマンティック・リバースエンジニアリング手法の文書(`docs/`)
- エージェントスキル本体(`skills/teacher-keaton/SKILL.md`)
- **フェーズ0: 理解対象の明確化(スコープ合意)** — 高コストな形式化の前に
  良い質問で対象を絞り、「理解計画」としてユーザーと合意する。
  期待の不一致による時間・クレジットの浪費と、収束しない問題を防止する
- 投影ツール群(`skills/teacher-keaton/tools/`):
  - `explain` — 全部入り解説書(用語表・概念マップ・振る舞いの図を単一Markdownで)
  - `project` — 宣言的な投影仕様とQuintトレースから図を生成
  - `glossary` — CUEのglossaryから用語表を生成
  - `gen-mermaid-diagram` — CUEの語彙と関係から概念マップを生成
  - `gen-quint-constants` — CUEのknownIdsからQuint定数を生成
  - `check-consistency` — CUEとQuintの語彙整合を検査
- 新規プロジェクト用のspec雛形(`skills/teacher-keaton/templates/`)
- 手本(`examples/`): momotaro(ナラティブ)、todo-cli(状態機械)
- **投影の変数参照検査** — `check-consistency` が `projection.cue` の `when` が
  参照するQuint変数の宣言済みを確認。変名の誤りで「エラーゼロで何も出ない図」に
  なる静黙失敗を防ぐ
- **不変条件の全件検証ツール `verify`** — `.qnt` の頂層 `val <Name>: bool` を
  すべて抽出して `quint verify` へ渡し、「定義N件 / 指定N件 / 検証成功N件」を報告。
  `--invariant` の手作業列挙で1件落としても検知できなかった問題を、
  検証対象一覧を正本として持つことで構造的に防ぐ
- **未使用警告の分類(`quintExpected`)** — `check-consistency` は、
  `vocabulary.cue` の `quintExpected` に挙がった概念のQuint未使用だけを
  「モデルの穴」として警告するようになった。構造専用(用語表・概念マップのみ)・
  投影専用(イベント等)の概念は警告せず、信号対雑音比を保つ
  (原則「健全だが完全ではない」との矛盾を解消)
- **概念の根拠位置 `sources`** — 概念に任意の `sources: [{location, note?}]` を
  宣言でき、用語表に根拠カラムが出る。`location` は自由形式の位置表記で、
  コード以外の文書・表を事実源にする適用でも監査性を担保する
- **`explain --all-tests` / `--output`** — `.qnt` の `run <名前>Test` をすべて
  列挙してシナリオごとの図を一つのMarkdownに束ね、ファイルへ書き出せる。
  複数シナリオの成果物を利用側で手作業で束ねる必要をなくす

### Changed

- **スキル配布物の自己完結化** — `SKILL.md`・`templates/`・テストが、配布先に
  存在しないファイル(`examples/`・`docs/conventions.md`)を参照していた問題を解消。
  規約の核心(差分述語・constantsのモジュール命名・projectionの書き方)は
  `SKILL.md` へ蒸留し、CLIテストはスキル内の自己完結fixtureへ切り替えた。
  `examples/` はリポジトリ内の開発・回帰テスト専用として残り、配布しない。
  具体的な完成例は模倣の锚(アンカー)となって出力の収束を妨げ、行使を
  トークンヘビーにするため、意図的に配布対象から外す
- `templates/model.qnt` に、概念を定数(`Set[str]`)で保持するパターンも併記。
  「定数を参照せよ」と宣言しながら雛形自身が定数を使わない自己矛盾を解消
- **図のラベルを語彙の管理下へ** — `projection.cue` の `label` を廃止。
  イベントもCUEの概念として宣言し、図のラベルはイベントのidから語彙の表示名へ
  解決する。同じイベントがビューやセッションごとに別の言い方になる認識のずれと、
  「図にはあるがモデルには無い語」というハルシネーションの露出面を消す。
  `render` は語彙に無いidを黙って図に出さず失敗するようになり、
  `check-consistency` は `event`/`from`/`to` の既知idを検査する。
  実例(momotaro/todo-cli)はイベントを概念として宣言する形へ作り替え
