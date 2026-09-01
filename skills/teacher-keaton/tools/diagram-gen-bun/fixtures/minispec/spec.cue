package minispec

// テスト専用の最小spec。模倣対象の手本ではない
// (完全なspecの形は templates/ を参照)。

vocabulary: {
	"注文": {id: "order", kind: "entity"}
	"商品": {id: "product", kind: "entity"}
	"倉庫": {id: "warehouse", kind: "entity"}
}

relations: [
	{from: "order", to: "product", label: "含む"},
	{from: "warehouse", to: "product", label: "保管する"},
]

glossary: {
	"注文": {id: "order", kind: "entity", definition: "商品を含む取引単位。"}
	"商品": {id: "product", kind: "entity", definition: "注文に含まれる品目。"}
	"倉庫": {id: "warehouse", kind: "entity", definition: "商品を保管する場所。"}
}

projection: {events: []}
