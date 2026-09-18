# templates — 新規プロジェクト用 spec 雛形

新しいシステムを形式化する際の `spec/` の出発点。このディレクトリのファイルを
対象プロジェクトの **`keaton_YYYYMMDDHHmmss/spec/`** にコピーし、`<...>` のプレースホルダを埋めて使う。

```
templates/
├── schema.cue        エンティティのスキーマ雛形
├── domain.cue        ドメインの概念(状態/キャラクター等)の雛形
├── measures.cue      測度(数値尺度)の雛形。範囲・極性・閾値・超過時の意味(任意)
├── vocabulary.cue    vocabulary/glossary/knownIds/relations の雛形
├── projection.cue    投影仕方の雛形(message と transition の両例)
├── model.qnt         Quint 振る舞いモデルの雛形
└── about.cue         解説のメタデータ(題名・目的・範囲。任意)
```

## 使い方

1. このファイル群を対象の `spec/` にコピーする(`about.cue` は任意)。
2. `<concept>` `<name>` `<kind>` 等のプレースホルダを実際の値に置き換える。
3. `schema.cue` / `domain.cue` で構造を、`model.qnt` で振る舞いを、
   `projection.cue` で投影の意味づけを記述する。
   イベント(遷移・メッセージの名前)も概念として宣言する —
   図のラベルはイベントのidから語彙の表示名へ解決される。
   用語表へ投影する全概念に `origin` と1件以上の `sources` を書く。
   原資料に直接ある概念は `observed` とする。
   観測事実からモデル化のために追加した概念は `inferred` とし、
   `inferenceReason` に追加理由も書く。
   推論は根拠の代わりではないため、`inferred` でも `sources` を省略しない。
   境界条件の用例は `positives/`(許可されるべき实例)と `negatives/`
   (拒否されるべき实例)へ最低1件ずつ書く。
4. 検証と生成:
   ```sh
   bun <skill>/tools/vet <spec>
   bun <skill>/tools/gen-quint-constants <spec>
   quint typecheck <spec>/<name>.qnt
   bun <skill>/tools/check-consistency <spec>
   bun <skill>/tools/explain <spec> --output keaton_YYYYMMDDHHmmss/explanation.md
   ```

## 2つの原型

| 原型 | 特徴 | 投影 |
|---|---|---|
| ナラティブ | 参加者間の相互作用 | シーケンス図(`message`) |
| 状態機械 | レコードの状態変化 | 状態遷移図(`transition`) |

`projection.cue` に `message` を書けばシーケンス図、`transition` を書けば状態図になる。
両方を一度に書くのではなく、システムの構造に合う一方を選ぶ。

## 測度(数値尺度)を持つシステム

数値項目を扱う場合は `measures.cue` も使う。数値は範囲だけでは意味が決まらず、
**値が大きいほど良いのか悪いのか(極性)**という契約が別にある。極性は項目名から
推定してはならないので、範囲・極性・閾値・超過時の意味・根拠を一組で宣言し、
比較の向きはそこから導出する。

1. `measures.cue` に測度を宣言する(測度と閾値は概念なので安定idと表示名を持つ)。
2. `vocabulary.cue` の測度・閾値のブロック(コメント)を有効にする。
3. `gen-quint-constants` を実行すると、閾値の定数と
   `<閾値>IsWorseSide` / `<閾値>IsBetterSide` が生成される。
   Quint では生の `v >= 3` を書かず、この述語を使う。
4. 用例は二層に分ける:
   - **動作テスト**: 閾値の前後で結果が変わる(Quint の `run ...Test`)
   - **意味テスト**: 極性と閾値の意味が仕様と一致する
     (`#MeasureVerdict` を使った `positives/` `negatives/`、Quint の不変条件)
5. `projection.cue` では増減ではなく `measureWorsens` / `measureImproves` /
   `measureEntersWorseSide` で書く。増加が悪化かどうかは極性から解決される。
