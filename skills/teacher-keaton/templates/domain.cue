package <name>

// ドメインの概念。各概念に 安定id / 表示名 / 定義 / (必要なら)関係 を与える。
// 表示名とidentityを分離するのが肝: 図・会話は表示名、データはidを使う。
//
// 状態機械なら状態を並べる。ナラティブなら登場人物・アイテムを並べる。
// イベント(遷移・メッセージの名前)も概念として宣言する。
// 投影のラベルはイベントのidから語彙が表示名を解決するため。

<concepts>: {
	<key1>: #<Concept> & {
		id:            "<kind>-<key1>"
		preferredName: "<表示名1>"
		definition:    "<定義1>"
		origin:        "observed"
		sources: [{location: "<ファイル:行または文書の節>", note: "<名称または定義を直接確認できる箇所>"}]
		// relations: [{type: "<relation-type>", target: "<kind>-<key2>"}]
	}

	<key2>: #<Concept> & {
		id:            "<kind>-<key2>"
		preferredName: "<表示名2>"
		definition:    "<定義2>"
		origin:        "inferred"
		sources: [{location: "<ファイル:行または文書の節>", note: "<基にした観測事実>"}]
		inferenceReason: "<観測事実から、この概念をモデルに置いた理由>"
	}
}
