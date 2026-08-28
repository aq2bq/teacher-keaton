package <name>

// 構造検証のスキーマ層: 「このデータは well-formed か」
// コードが読込時に行っている検証(重複ID拒否・必須フィールド・値の範囲等)を写し取る。

// 必要なら列挙型や部分スキーマをここに定義する。
// 例: #TaskStatus: "backlog" | "active" | "done"

// 中心となるエンティティのスキーマ。
// <kind> は種別(例: "character" / "item" / "status")。
#<Concept>: {
	id:            string @ja(識別子)
	preferredName: string @ja(名称)
	definition:    string @ja(定義)
	// 必要に応じて属性や関係を足す。
	// relations?: [...#Relation] @ja(関係)
}

// 関係のスキーマ(概念同士を繋ぐ場合)。
// #Relation: {
// 	type:   "<relation-type>" @ja(関係種別)
// 	target: string            @ja(対象)
// }
