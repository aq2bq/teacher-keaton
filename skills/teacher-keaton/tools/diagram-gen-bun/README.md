# diagram-gen-bun

Specification IR(JSON契約)からMermaid図を生成するツール。採用の経緯はリポジトリルートの `SPIKE.md` を参照。

## ライブラリの入力契約

`diagram-gen-bun/index.ts` を直接実行する場合は、標準入力に以下のJSONを渡す。

```json
{
  "vocabulary": {
    "桃太郎": { "id": "char-momo", "kind": "character" }
  },
  "relations": [
    { "from": "char-momo", "to": "char-oni", "label": "敵対" }
  ],
  "focus": { "concept": "char-momo", "depth": 1 }
}
```

- `vocabulary`: 日本語呼称 → `{id, kind}`。ノードとして描画される
- `relations`: `{from, to, label}` の配列。`from`/`to` は `vocabulary` の `id` を指す。未知のidを指すとエラーになる
- `focus`(任意): `concept` は用語またはstable id、`depth` は関係の向きを問わず何辺先まで含めるかを示す非負整数

モノレポ内のアプリケーションでこの契約を満たすJSONを出力できれば、どのアプリでも使える。

## 使い方

CLIラッパーが `vocabulary` と `relations` をspecから `cue export` で読み、Mermaidを標準出力へ書く。

```sh
tools/gen-mermaid-diagram apps/momotaro/spec [--focus <用語または概念id>] [--focus-depth <n>]
```

出力は標準出力のMermaid(`graph LR` 形式)。GitHubのMarkdownコードブロックやMermaid Live Editorに貼れる。

```sh
# ファイルへ保存する場合
tools/gen-mermaid-diagram apps/momotaro/spec > diagram.mmd

# テスト
cd tools/diagram-gen-bun && bun test
```

## 出力の規則

- ノードはstable idの昇順で並ぶ(JSONオブジェクトの列挙順に依存しない)
- ノードIDは出力ごとに振り直し(`n0`, `n1`, ...)、ラベルに日本語呼称を使う
- `--focus-depth` の既定は1。`--focus` を省略した場合は従来どおり全体図を出す
