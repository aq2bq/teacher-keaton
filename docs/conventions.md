# 規約: specの構造と書き方

形式モデルは対象プロジェクトの **`keaton/spec/`** に置く(既定の出力先)。
Rubyの `spec/`(RSpec)など各言語の慣習と衝突しないよう、専用の `keaton/`
名前空間を使う。ツールは `<specパス>` を省略すると `keaton/spec` を使う。
`examples/` に実例、`templates/` に雛形がある。

対象プロジェクトのルートでスキルを実行し、作成または保持するファイルは
実行場所の `keaton/` に収める。
**成果物ルート**とは、この `keaton/` を指す。

## keaton/ の構成

```
<プロジェクト>/
└── keaton/
    ├── explanation.md        explain が書き出す照合用の解説書
    ├── TODO.md               未解決の食い違いがある場合だけ作る根拠付き記録
    ├── verify-result.json    tools/verify が書き出す検証結果(任意。explainが取り込む)
    ├── verify.log            Quint・Apalacheの検証詳細ログ(最新実行で上書き)
    ├── tmp/                  トレースと検査用コピー。通常処理後に削除する
    └── spec/
        ├── schema.cue        エンティティのスキーマ・enum・構造制約
        ├── <domain>.cue      ドメインの概念(状態やキャラクター等)。id/preferredName/definition/relations
        ├── measures.cue      測度(数値尺度)。範囲・極性・閾値・超過時の意味(数値がある場合)
        ├── vocabulary.cue    vocabulary / glossary / knownIds / relations / 参照整合性検査
        ├── projection.cue    投影仕様(状態差分の意味づけ)
        ├── about.cue         解説のメタデータ(題名・目的・範囲・除外範囲。任意)
        ├── <name>.qnt        Quint の振る舞いモデル
        ├── constants.qnt     CUEのknownIdsから生成されたQuint定数(手編集禁止)
        ├── positives/        許可されるべき实例(境界条件ごとに最低1件)
        └── negatives/        拒否されるべき实例(境界条件ごとに最低1件)
```

`keaton/` をルートにするのは、将来spec以外の成果物を置く余地を残すため。
`TODO.md` のパスは `<プロジェクト>/keaton/TODO.md` とする。
`explanation.md` のパスは `<プロジェクト>/keaton/explanation.md` とする。
スキルが一時ファイルや作業メモを直接作る場合も `keaton/tmp/` を使い、
`/tmp` や実行場所直下の `tmp/` には作らない。
明示した `<specパス>` は、`examples/` など既存モデルを検証する開発用途に限る。

## 解説のメタデータ(about)

`about.cue` に `about: {title, purpose, scope, exclusions, operationalUndecided}` を書くと、
`explain` が題名と `## 概要` 節を出力し、解説書が単体で完結する。
内容はフェーズ0で合意した**理解計画**と対応付ける(目的・範囲・深さの
合意事項を、成果物側にも残す)。任意であり、無ければディレクトリ名が
題名になる。`operationalUndecided` は、原資料が担当者・手順・時期・教育・記録方法などを
まだ決めていないが、観測事実同士は両立している事項を文字列配列で記録する。
1件以上あれば `explain` が `## 運用未確定` 節として出力する。
`tools/verify` の結果は `keaton/verify-result.json` へ書き出され、
`explain` が `## 形式モデルの検証` 節として取り込む。同節には、結果に記載された探索深度までの
不変条件検査であり、教育・記録・遵守を含む現場運用の実効性は検証していないことを示す。
`keaton/spec` を使う `explain` は、解説書を `keaton/explanation.md` へ保存する。

## 未確定事項と対象外の保存先

| 観測した状態 | 保存先 | モデルとビュー |
|---|---|---|
| 追加調査後も観測事実が一つの語彙または論理構造へ収束しない | `keaton/TODO.md` | 依存する範囲を保留する |
| 原資料が運用上の選択をまだ決めていないが、観測事実同士は両立する | `about.operationalUndecided` | 未決定の選択を推測で足さず、観測できる範囲は続行する |
| 理解計画で調査または形式化しないと合意した | `about.exclusions` | 合意した対象範囲だけを続行する |

運用未確定や対象外だけを理由に `TODO.md` を作らない。
最終報告では3つを別項目にし、`TODO.md` はレベル2見出し、残りは配列要素を数える。
0件の分類も0件と明記し、ファイルがないことと報告漏れを区別する。

## TODO.md の構造

`TODO.md` は、追加調査後も実コードだけでは一つの語彙または論理構造へ収束しない
**未解決の食い違い**がある場合だけ作成する。
形式モデルの検証結果と区別するため、`spec/` の中には置かない。

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

## 境界条件の用例(positives / negatives)

`cue vet` は「書いた記述同士の矛盾」しか検出しない。**緩すぎる制約
(許可してはいけないものを許可する)は矛盾ではない**ので、負例をぶつけて
初めて検査できる。主要な境界条件ごとに用例を書く:

- `positives/<名前>.cue` — 許可されるべき实例。specと合わせて `cue vet` が
  成功しなければならない(失敗するなら制約が厳しすぎる)
- `negatives/<名前>.cue` — 拒否されるべき实例。specと合わせて `cue vet` が
  失敗しなければならない(成功するなら制約が緩すぎる)

用例ファイルはspecと同じパッケージ名で書き、スキーマの定義を参照して
(`bad: #Task & {...}` のように)違反を作る。`tools/vet` が両方向を機械的に
検査し、「正例N/N通過、負例N/N拒否」を報告する。

既知の限界: 検査されるのは書かれた用例だけ(網羅ではなく標本)。また
負例が「拒否された」とき、意図した制約で拒否されたか、負例ファイル自体の
タイプミスで拒否されたかは区別できない。

## 測度(数値尺度)

数値項目は**範囲だけでは意味が決まらない**。値が大きくなるほど良い状態なのか
悪い状態なのかという契約(**極性**)が別にあり、これは項目名から推定できない。
「品質」「満足度」のように名前が肯定的でも、実際には「悪さ」「気になる程度」
「困りごとの強さ」を測っていて、小さいほど良い尺度であることがある。

そこで、各測度について**範囲・極性・閾値・閾値を超えたときの意味**を一組で宣言し、
比較の向きはそこから導出する。測度と閾値も概念なので、安定idと表示名を持ち、
`vocabulary` / `glossary` / `knownIds` に載せる。

```cue
measures: {
  annoyance: #Measure & {
    id:            "measure-annoyance"
    preferredName: "気になる度"
    definition:    "利用者が気にしている度合い。名前は肯定的だが、測っているのは困りごとの強さ。"
    range: {min: 0, max: 10}
    polarity: "lowerIsBetter"           // higherIsBetter | lowerIsBetter | neutral | unresolved
    polarityEvidence: [{location: "src/alert.ts:12", note: "値が大きいときに警告"}]
    quintVar: "annoyance"
    thresholds: [{
      id: "threshold-annoyance-high", preferredName: "要対応の閾値"
      at: 3, inclusive: true, meaning: "要対応として扱う", entersState: "alert"
    }]
  }
}
```

- `polarity` は enum。`unresolved` 以外では `polarityEvidence` を**1件以上必須**にして、
  「名前から推定した向き」が入り込む余地を消す。
- `inclusive` は閾値の値そのものを悪い側に含めるか(既定 `true`)。
  「3以上は要対応」は既定、「80未満は不合格」は `inclusive: false`。
- 実コードから向きが決まらない場合は発明せず、`polarity: "unresolved"` と
  `unresolvedNote`(決まらない理由)を書き、未解決の食い違いとして `TODO.md` へ渡す。
  `neutral` は「良し悪しの向きを持たない」(座標・設定値等)であり、
  「分からない」とは別物なので混同しない。

### 極性の根拠として認めるもの

| 探す場所 | 何が分かるか |
|---|---|
| 閾値を超えたときの分岐先 | 警告・アラート・エスカレーションが出る側が悪い側 |
| 文言(メッセージ・ラベル) | 「要対応」「良好」がどちらの値に付くか |
| ソート順 | 悪いものを上に出しているか |
| 色分け・アイコン | 赤や警告色が付く側 |
| 集計での扱い | `min`/`max` のどちらを「最悪」と呼ぶか |

### 比較の向きを書き分けない

`>=` と `<=` を人が書き分ける箇所を作らない。向きの原本は極性であり、
そこから導出する経路が3つ用意されている。

| 層 | 導出のしかた |
|---|---|
| CUE(用例) | `#MeasureVerdict` に測度・閾値・値を渡すと `isWorseSide` が導出される |
| Quint(実装) | `gen-quint-constants` が `<閾値>IsWorseSide` / `<閾値>IsBetterSide` を生成する |
| 投影(図) | `measureWorsens` / `measureImproves` / `measureEntersWorseSide` |

`check-consistency` は、測度の変数と閾値を**生の比較**(`v >= 3`、
`v <= <閾値>At`)で書いた行を検出して失敗させる。生成された述語の名前が
「その比較が悪い側の検出か良い側の検出か」を残すため、公開識別子を変えられない
場合でも、内部の意味名から向きを追える。

### 動作のテストと意味のテストを分ける

| テスト | 何を確かめるか | どこに書くか |
|---|---|---|
| 動作テスト | 閾値の前後で結果が変わる。閾値の値そのものがどちら側か | Quint の `run ...Test` |
| 意味テスト | 極性と閾値の解釈が仕様と一致する | CUE の `positives/`・`negatives/`(`#MeasureVerdict`)、Quint の頂層 `val` |

意味テストの負例は「逆向きの解釈が拒否されること」を書く。
さらに、**宣言した極性を反転させて `vet` が落ちるか**を見ると、その極性が
モデルの荷重部材になっているか(飾りになっていないか)を確かめられる。

## 安定識別子(stable id)

- 各概念に、**改名しても変わらない** id を付ける。
- 種別ごとに接頭辞を付ける: `char-`(登場人物)、`item-`(アイテム)、
  `event-`(イベント)。状態は状態名そのもの(`backlog`)を id にしてよい。
- 表示名(`preferredName`)と identity(id)を分離する。図・会話では表示名を、
  データでは id を使う。
- 用語表へ投影する全概念に `origin`(由来)と1件以上の
  `sources: [{location, note?}]`(観測位置)を持たせる。
  原資料に直接ある概念は `origin: "observed"` とする。
  観測事実からモデル化のために追加した概念は `origin: "inferred"` とし、
  空でない `inferenceReason`(追加理由)も持たせる。
  推論は根拠の代わりではないため、`inferred` でも `sources` を省略しない。
- `location` は自由形式の位置表記(`"src/task.ts:1"` / `"出荷規則.md §3.2"` /
  `"在庫.xlsx 'ロット状態'シート"`)とする。
  コード以外の文書を事実源にする場合も行番号に縛られない。
  用語表は `observed` を原資料、`inferred` を推論理由と観測位置に分けて表示する。

## vocabulary.cue の構造

```cue
// 用語→{id,種別}。図・会話のラベル解決の原本。
vocabulary: {
  for _, x in <concepts> {
    (x.preferredName): { id: x.id, kind: "<kind>" }
  }
}

// 用語→{id,種別,定義,由来,観測位置,必要なら推論理由}。用語表の元データ。
glossary: {
  for _, x in <concepts> {
    (x.preferredName): {
      id: x.id, kind: "<kind>", definition: x.definition
      origin: x.origin, sources: x.sources
      if x.origin == "inferred" {inferenceReason: x.inferenceReason}
    }
  }
}

// Quint定数の元になる既知idの一覧。
knownIds: [for _, x in <concepts> {x.id}]

// Quintの振る舞いモデルに現れるべき概念(行動の核)のid一覧。
// check-consistency はここに挙がった概念のQuint未使用だけを警告する。
// 構造専用(用語表・概念マップのみ)や投影専用(イベント等)の概念は挙げない。
quintExpected: [ ... ]

// 図示用の関係リスト {from, to, label}。
relations: [ ... ]
```

`vocabulary` と `glossary` は概念データから**自動生成**する(二重管理しない)。
同じ表示名が複数のidを持つと unification が衝突し、一意性が構造的に強制される。
`knownIds` の全概念を `glossary` に含める。
`check-consistency` はこの対応と、全用語の由来と根拠が揃っていることを検査する。

`quintExpected` は「どの概念を振る舞いとして形式化するつもりか」の正本。
原則は**健全だが完全ではない** — 全概念の形式化は目指さず、行動の核だけ挙げる。
リスト外の概念は構造・投影専用とみなされ、Quint未使用を警告されない。
通常概念は生成文字列定数の参照、測度は `quintVar` に対応する変数宣言、閾値は
生成された閾値定数・述語のモデル本体での参照によって使用済みになる。
`constants.qnt` をimportしただけでは、どの概念も使用済みにならない。

## Quint の書き方

- `constants.qnt` は `gen-quint-constants` で生成する。手編集しない。
- `<name>.qnt` の先頭で `import <Module>Constants.* from "./constants"`。
- 状態・遷移・不変条件を書く。文字列リテラルは使わず定数を参照する。
- **不変条件は頂層の `val <Name>: bool`** として書く。`tools/verify` が
  これを抽出して全件検証する(検証対象一覧の正本)。補助の補題は
  `def` / `pure def` で書く(不変条件として抽出されない)。
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

「どの状態変化が・誰から誰への/どの状態からどの状態への・どのイベントか」を
宣言する。汎用ツール `project`/`explain` がこれを評価する。

**イベントも概念であり、ラベルは書かない。** イベントはドメインファイルに
概念として宣言し(`event-` 接頭辞推奨)、表示名はイベントのidから語彙が解決する。
図に出る語を語彙の管理外で再入力させないための規約である。

```cue
projection: {
  format: "sequenceDiagram"   // 既定の形式: sequenceDiagram | stateDiagram
  events: [
    {
      event: "event-give"     // CUEの既知id(概念として宣言したイベント)
      when: [
        {kind: "setGains", var: "companions", bind: "to"},
        {kind: "intDecreases", var: "dango"},
      ]
      message: {from: "char-momo", to: "$to"}
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
| `sequenceAppends` | リスト(観測ログ)に要素が**加わった** | 加わった要素 |
| `measureWorsens` | 測度が**悪化した**(向きは極性から解決) | — |
| `measureImproves` | 測度が**改善した**(向きは極性から解決) | — |
| `measureEntersWorseSide` | 測度が閾値の**悪い側へ入った** | — |
| `measureEntersBetterSide` | 測度が閾値の**良い側へ戻った** | — |

測度の述語は `measure: "<測度id>"`(閾値の跨ぎはさらに `threshold: "<閾値id>"`)を取り、
`var` は測度の `quintVar` と一致していなければならない。増加が悪化かどうかは
極性から解決されるため、投影に向きを書かない — 極性を直せば図が自動で追随する。

`sequenceAppends` は `value` で特定のイベント定数に絞り込める。
拒否・重複拒否のようにドメイン状態を変えない事象は、観測専用のリスト変数
(例: `observedEvents: List[str]`)への記録としてモデル化し、この述語で投影する。
`.fail()` で終わるテストは「不可能の証明」であり図には出ない — 図に出したい
事象は記録方式で表す。観測専用変数はドメイン状態ではないので不変条件に使わない。

`bind: "<name>"` で差分の値を捕まえ、`message`/`transition` の `from`/`to` で
`"$<name>"` として参照する。リテラル(例: `"char-momo"`)もそのまま書ける。

### message と transition

- `message`: **参加者間のメッセージ**(シーケンス図)。ナラティブ向き。
  `from`/`to` は語彙のid。
- `transition`: **状態間の遷移**(状態遷移図)。状態機械向き。
  `from`/`to` は状態のid。開始は `"[*]"`。
- ラベルはどちらにも書かない。イベントのidから語彙の表示名へ解決される。
  `event`/`from`/`to` が既知idかは `check-consistency` が検査する。

一つのプロジェクションは `message` か `transition` のどちらか一方に統一する。
`explain` は `message` があればシーケンス図、`transition` があれば状態図を出す(適応型)。

### 形式

`--format` で `sequenceDiagram` / `stateDiagram` / `json` を選べる。`json` は形式非依存の
イベント列(投影の中間表現)。新しい形式を追加しても、エンジンや投影仕様は変わらない。

## 命名

- ファイル: `schema.cue` / `vocabulary.cue` / `projection.cue` / `<name>.qnt` / `constants.qnt`。
- Quintモジュール名: アプリのディレクトリ名から生成(`todo-cli`→`Todo`)。
- 表示名は日本語でよい。語彙の原本はCUEなので、図も日本語ラベルになる。
