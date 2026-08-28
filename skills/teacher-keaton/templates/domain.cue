package <name>

// ドメインの概念。各概念に 安定id / 表示名 / 定義 / (必要なら)関係 を与える。
// 表示名とidentityを分離するのが肝: 図・会話は表示名、データはidを使う。
//
// 状態機械なら状態を並べる(例は examples/todo-cli/spec/statuses.cue)。
// ナラティブなら登場人物・アイテムを並べる(例は examples/momotaro/spec/)。

<concepts>: {
	<key1>: #<Concept> & {
		id:            "<kind>-<key1>"
		preferredName: "<表示名1>"
		definition:    "<定義1>"
		// relations: [{type: "<relation-type>", target: "<kind>-<key2>"}]
	}

	<key2>: #<Concept> & {
		id:            "<kind>-<key2>"
		preferredName: "<表示名2>"
		definition:    "<定義2>"
	}
}
