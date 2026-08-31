# 規約: specの構造と書き方

形式モデルは対象プロジェクトの **`keaton/spec/`** に置く(既定の出力先)。
Rubyの `spec/`(RSpec)など各言語の慣習と衝突しないよう、専用の `keaton/`
名前空間を使う。ツールは `<specパス>` を省略すると `keaton/spec` を使う。
`examples/` に実例、`templates/` に雛形がある。

## keaton/ の構成

```
<プロジェクト>/
└── keaton/
    ├── TODO.md               未解決の食い違いがある場合だけ作る根拠付き記録
    └── spec/
        ├── schema.cue        エンティティのスキーマ・enum・構造制約
        ├── <domain>.cue      ドメインの概念(状態やキャラクター等)。id/preferredName/definition/relations
        ├── vocabulary.cue    vocabulary / glossary / knownIds / relations / 参照整合性検査
        ├── projection.cue    投影仕様(状態差分の意味づけ)
        ├── <name>.qnt        Quint の振る舞いモデル
        └── constants.qnt     CUEのknownIdsから生成されたQuint定数(手編集禁止)
```

`keaton/` をルートにするのは、将来spec以外の成果物を置く余地を残すため。
`TODO.md` のパスは `<プロジェクト>/keaton/TODO.md` とする。
明示した `<specパス>` を使う場合も、対象プロジェクトの `keaton/` へ置く。

## TODO.md の構造

`TODO.md` は、追加調査後も実コードだけでは一つの語彙または論理構造へ収束しない
**未解決の食い違い**がある場合だけ作成する。
検証済みの形式モデルと区別するため、`spec/` の中には置かない。

```markdown
# 未解決の食い違い

## <両立しない対象を具体的に書く>

- 観測事実:
  - `<ファイル位置>`: <コードが現に行うこと>
  - `<ファイル位置>`: <両立しない別の事実>
- 検証失敗または反証:
  - `<再現コマンド>`
  - <判断に必要な結果>
- 両立しない理由: <...>
- 保留したモデルとビュー: <...>
- ユーザーに求める判断: <...>
```

検証結果は判断に必要な範囲を残し、長い出力をそのまま転載しない。
各項目はレベル2見出し1つで表し、最終報告の未解決項目数はこの見出しを数える。
同じ食い違いを再検出した場合は項目を増やさず、既存項目の根拠と影響を更新する。
解決した項目は削除し、未解決項目が0件になったら `TODO.md` 自体を削除する。

## 安定識別子(stable id)

- 各概念に、**改名しても変わらない** id を付ける。
- 種別ごとに接頭辞を付ける: `char-`(登場人物)、`item-`(アイテム)。
  状態は状態名そのもの(`backlog`)を id にしてよい。
- 表示名(`preferredName`)と identity(id)を分離する。図・会話では表示名を、
  データでは id を使う。

## vocabulary.cue の構造

```cue
// 用語→{id,種別}。図・会話のラベル解決の原本。
vocabulary: {
  for _, x in <concepts> {
    (x.preferredName): { id: x.id, kind: "<kind>" }
  }
}

// 用語→{id,種別,定義}。用語表の元データ。definitionを集約する。
glossary: {
  for _, x in <concepts> {
    (x.preferredName): { id: x.id, kind: "<kind>", definition: x.definition }
  }
}

// Quint定数の元になる既知idの一覧。
knownIds: [for _, x in <concepts> {x.id}]

// 図示用の関係リスト {from, to, label}。
relations: [ ... ]
```

`vocabulary` と `glossary` は概念データから**自動生成**する(二重管理しない)。
同じ表示名が複数のidを持つと unification が衝突し、一意性が構造的に強制される。

## Quint の書き方

- `constants.qnt` は `gen-quint-constants` で生成する。手編集しない。
- `<name>.qnt` の先頭で `import <Module>Constants.* from "./constants"`。
- 状態・遷移・不変条件を書く。文字列リテラルは使わず定数を参照する。
- `run` で書くシナリオテストは、名前を `Test` で終わらせる
  (`quint test` は `Test` 结尾の `run` だけ実行する)。

### 定数モジュール名の決まり方

`gen-quint-constants` が生成する `constants.qnt` のモジュール名は、specディレクトリの
位置から決まる。`<name>.qnt` の `import` と一致させる必要がある。

| specの場所 | モジュール名 |
|---|---|
| `<project>/keaton/spec`(既定) | `<Project>Constants`(プロジェクト名。例: `MyappConstants`) |
| `apps/momotaro/spec` | `MomotaroConstants`(アプリ名) |
| `apps/todo-cli/spec` | `TodoCliConstants`(ハイフンはcamelCase化) |

既定の `keaton/spec` では直親が `keaton` なので、その一つ上のプロジェクト名を使う。
生成後に `constants.qnt` の `module` 行を確認し、`<name>.qnt` の `import` と揃えること。

## projection.cue の書き方(核心)

「どの状態変化が・誰から誰への/どの状態からどの状態への・何というイベントか」を
宣言する。汎用ツール `project`/`explain` がこれを評価する。

```cue
projection: {
  format: "sequenceDiagram"   // 既定の形式: sequenceDiagram | stateDiagram
  events: [
    {
      event: "give"
      when: [
        {kind: "setGains", var: "companions", bind: "to"},
        {kind: "intDecreases", var: "dango"},
      ]
      message: {from: "char-momo", to: "$to", label: "きびだんごを与える"}
    },
  ]
}
```

### 差分述語(`when`)

最小の述語をANDで組み合わせる。足りないケースが出てから拡張する。

| 述語 | 検出する変化 | bind |
|---|---|---|
| `setGains` | 集合に要素が**加わった** | 加わった要素 |
| `setLoses` | 集合から要素が**減った** | 減った要素 |
| `move` | 要素が集合Aから集合Bへ**移った** | 移った要素 |
| `intDecreases` | 整数が**減った** | — |
| `intIncreases` | 整数が**増えた** | — |
| `boolBecomes` | ブールが指定値に**変わった** | — |

`bind: "<name>"` で差分の値を捕まえ、`message`/`transition` の `from`/`to` で
`"$<name>"` として参照する。リテラル(例: `"char-momo"`)もそのまま書ける。

### message と transition

- `message`: **参加者間のメッセージ**(シーケンス図)。ナラティブ向き。
  `from`/`to` は語彙のid。
- `transition`: **状態間の遷移**(状態遷移図)。状態機械向き。
  `from`/`to` は状態のid。開始は `"[*]"`。

一つのプロジェクションは `message` か `transition` のどちらか一方に統一する。
`explain` は `message` があればシーケンス図、`transition` があれば状態図を出す(適応型)。

### 形式

`--format` で `sequenceDiagram` / `stateDiagram` / `json` を選べる。`json` は形式非依存の
イベント列(投影の中間表現)。新しい形式を追加しても、エンジンや投影仕様は変わらない。

## 命名

- ファイル: `schema.cue` / `vocabulary.cue` / `projection.cue` / `<name>.qnt` / `constants.qnt`。
- Quintモジュール名: アプリのディレクトリ名から生成(`todo-cli`→`Todo`)。
- 表示名は日本語でよい。語彙の原本はCUEなので、図も日本語ラベルになる。
