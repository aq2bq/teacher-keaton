# templates — 新規プロジェクト用 spec 雛形

新しいシステムを形式化する際の `spec/` の出発点。このディレクトリのファイルを
対象プロジェクトの **`keaton/spec/`** にコピーし、`<...>` のプレースホルダを埋めて使う。

```
templates/
├── schema.cue        エンティティのスキーマ雛形
├── domain.cue        ドメインの概念(状態/キャラクター等)の雛形
├── vocabulary.cue    vocabulary/glossary/knownIds/relations の雛形
├── projection.cue    投影仕様の雛形(message と transition の両例)
└── model.qnt         Quint 振る舞いモデルの雛形
```

## 使い方

1. この5ファイルを対象の `spec/` にコピーする。
2. `<concept>` `<name>` `<kind>` 等のプレースホルダを実際の値に置き換える。
3. `schema.cue` / `domain.cue` で構造を、`model.qnt` で振る舞いを、
   `projection.cue` で投影の意味づけを記述する。
   イベント(遷移・メッセージの名前)も概念として宣言する —
   図のラベルはイベントのidから語彙の表示名へ解決される。
4. 検証と生成:
   ```sh
   cue vet -c <spec>
   bun <skill>/tools/gen-quint-constants <spec>
   quint typecheck <spec>/<name>.qnt
   bun <skill>/tools/check-consistency <spec>
   bun <skill>/tools/explain <spec>
   ```

## 2つの原型

| 原型 | 特徴 | 投影 |
|---|---|---|
| ナラティブ | 参加者間の相互作用 | シーケンス図(`message`) |
| 状態機械 | レコードの状態変化 | 状態遷移図(`transition`) |

`projection.cue` に `message` を書けばシーケンス図、`transition` を書けば状態図になる。
両方を一度に書くのではなく、システムの構造に合う一方を選ぶ。
