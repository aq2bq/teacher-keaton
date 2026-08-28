package momotaro

import "list"

// 語彙の一意性レジストリ。
// 会話と図示で日本語呼称の一意性を保証するための一次情報。

// 属性名の日本語呼称。キー = 日本語呼称、値 = フィールド名。
// 同じ日本語呼称に別フィールドを割り当てると unification が衝突し、
// vet が失敗する。つまり一意性が構造によって強制される。
fieldLabels: {
	"識別子":   "id"
	"種別":     "kind"
	"名称":     "preferredName"
	"別名":     "aliases"
	"定義":     "definition"
	"関係":     "relations"
	"関係種別": "type"
	"対象":     "target"
}

// 関係種別の日本語呼称。同じ強制が働く。
relationTypeLabels: {
	"育てられる": "raised-by"
	"仲間":     "companion-of"
	"敵対":     "enemy-of"
	"生みの親": "origin-of"
	"対価":     "payment-for"
}

// 登場人物・アイテムの名称から stable id への辞書は、
// characters / items から自動生成する(二重管理しない)。
// 2つのエンティティが同じ preferredName を持つと、
// この構造体の同名キーに異なる id が入り衝突する。
vocabulary: {
	for name, c in characters {
		(c.preferredName): {
			id:   c.id
			kind: "character"
		}
	}
	for name, i in items {
		(i.preferredName): {
			id:   i.id
			kind: "item"
		}
	}
}

// グロッサリー(用語表)。vocabulary に定義を加えたもので、
// 人間が読む解説書や学習ツールの材料になる。定義は characters / items
// のものを集約し、二重管理しない。
glossary: {
	for name, c in characters {
		(c.preferredName): {
			id:         c.id
			kind:       "character"
			definition: c.definition
		}
	}
	for name, i in items {
		(i.preferredName): {
			id:         i.id
			kind:       "item"
			definition: i.definition
		}
	}
}

// 参照整合性: relation の target は既知の id でなければならない。
// 未知の target があった場合のみ衝突するパスを生成して vet を失敗させる。
knownIds: list.Concat([[for _, c in characters {c.id}], [for _, i in items {i.id}]])

for name, c in characters {
	if c.relations != _|_ {
		for i, r in c.relations {
			if !list.Contains(knownIds, r.target) {
				referenceErrors: "\(name).relations[\(i)]: unknown target '\(r.target)'": true & false
			}
		}
	}
}

for name, i in items {
	if i.relations != _|_ {
		for j, r in i.relations {
			if !list.Contains(knownIds, r.target) {
				referenceErrors: "\(name).relations[\(j)]: unknown target '\(r.target)'": true & false
			}
		}
	}
}

// 関係の抽出(図示用)。characters / items の relations から
// {from, to, label} 形式へ自動生成する。label は relationTypeLabels の
// 逆引きで日本語呼称にする。手メンテのJSON(diagram-relations.json)を廃止し、
// specを正として一本化するための projection 入力。
jaLabelOf: {
	for ja, en in relationTypeLabels {
		(en): ja
	}
}

relations: list.Concat([
	for name, c in characters {
		if c.relations != _|_ {
			[for r in c.relations {
				{
					from:  c.id
					to:    r.target
					label: jaLabelOf[r.type]
				}
			}, ...]
		}
		if c.relations == _|_ {
			[]
		}
	},
	for name, i in items {
		if i.relations != _|_ {
			[for r in i.relations {
				{
					from:  i.id
					to:    r.target
					label: jaLabelOf[r.type]
				}
			}, ...]
		}
		if i.relations == _|_ {
			[]
		}
	},
])
