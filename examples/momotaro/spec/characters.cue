package momotaro

// 登場人物データ。
characters: {
	momo: #Character & {
		id:            "char-momo"
		kind:          "human"
		preferredName: "桃太郎"
		definition:    "川から流れてきた大きな桃から生まれた男の子。おじいさんとおばあさんに育てられる。"
		relations: [
			{type: "raised-by", target: "char-grandpa"},
			{type: "raised-by", target: "char-grandma"},
		]
	}

	grandpa: #Character & {
		id:            "char-grandpa"
		kind:          "human"
		preferredName: "おじいさん"
		definition:    "山へ芝刈りに行く老人。桃太郎を育てる。"
	}

	grandma: #Character & {
		id:            "char-grandma"
		kind:          "human"
		preferredName: "おばあさん"
		definition:    "川へ洗濯に行き、流れてきた桃を拾った老人。桃太郎を育てる。"
	}

	dog: #Character & {
		id:            "char-dog"
		kind:          "animal"
		preferredName: "犬"
		definition:    "道中で最初に加わった仲間。きびだんごと引き換えに桃太郎に同行する。"
		relations: [{type: "companion-of", target: "char-momo"}]
	}

	monkey: #Character & {
		id:            "char-monkey"
		kind:          "animal"
		preferredName: "猿"
		definition:    "道中で2番目に加わった仲間。"
		relations: [{type: "companion-of", target: "char-momo"}]
	}

	pheasant: #Character & {
		id:            "char-pheasant"
		kind:          "animal"
		preferredName: "雉"
		aliases:       ["キジ"]
		definition:    "道中で3番目に加わった仲間。"
		relations: [{type: "companion-of", target: "char-momo"}]
	}

	oni: #Character & {
		id:            "char-oni"
		kind:          "oni"
		preferredName: "鬼"
		definition:    "鬼ヶ島に住み、村の宝物を奪う存在。桃太郎に退治される。"
		relations: [{type: "enemy-of", target: "char-momo"}]
	}
}
