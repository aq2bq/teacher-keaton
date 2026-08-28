package momotaro

// アイテムデータ。
items: {
	momo: #Item & {
		id:            "item-momo"
		preferredName: "桃"
		definition:    "川上から流れてきて、おばあさんが拾った大きな桃。桃太郎はここから生まれた。"
		relations: [{type: "origin-of", target: "char-momo"}]
	}

	kibidango: #Item & {
		id:            "item-kibidango"
		preferredName: "きびだんご"
		definition:    "おばあさんが作った黍団子。桃太郎が仲間集めの報酬として支払う。"
		relations: [
			{type: "payment-for", target: "char-dog"},
			{type: "payment-for", target: "char-monkey"},
			{type: "payment-for", target: "char-pheasant"},
		]
	}
}
