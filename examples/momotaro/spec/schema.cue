package momotaro

// 構造検証のスキーマ層: 「このデータは well-formed か」

// 登場人物。stable identity は id が持つ。名称変更は preferredName / aliases。
#Character: {
	id:            string @ja(識別子)
	kind:          "human" | "animal" | "oni" @ja(種別)
	preferredName: string @ja(名称)
	aliases?:      [...string] @ja(別名)
	definition:    string @ja(定義)
	relations?:    [...#Relation] @ja(関係)
}

// 関係。target は既知エンティティの id を指す(実在検査は vocabulary.cue)。
#Relation: {
	type: "raised-by" | "companion-of" | "enemy-of" | "origin-of" | "payment-for" @ja(関係種別)
	target: string @ja(対象)
}

// アイテム。桃やきびだんごなど、物語に登場する物体。
#Item: {
	id:            string @ja(識別子)
	preferredName: string @ja(名称)
	definition:    string @ja(定義)
	relations?:    [...#Relation] @ja(関係)
}

// イベント。物語の進行上の出来事も概念であり、語彙の管理を受ける。
// 投影のラベルはイベントのidから表示名へ解決され、自由記述しない。
#Event: {
	id:            string @ja(識別子)
	preferredName: string @ja(名称)
	definition:    string @ja(定義)
}
