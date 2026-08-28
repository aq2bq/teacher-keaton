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
- 投影ツール群(`skills/teacher-keaton/tools/`):
  - `explain` — 全部入り解説書(用語表・概念マップ・振る舞いの図を単一Markdownで)
  - `project` — 宣言的な投影仕様とQuintトレースから図を生成
  - `glossary` — CUEのglossaryから用語表を生成
  - `gen-mermaid-diagram` — CUEの語彙と関係から概念マップを生成
  - `gen-quint-constants` — CUEのknownIdsからQuint定数を生成
  - `check-consistency` — CUEとQuintの語彙整合を検査
- 新規プロジェクト用のspec雛形(`skills/teacher-keaton/templates/`)
- 手本(`examples/`): momotaro(ナラティブ)、todo-cli(状態機械)
