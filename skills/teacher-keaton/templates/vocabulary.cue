package <name>

import "list"

// 語彙の原本。CUEを表示語彙とstable idの一次情報にする。

// 属性名の表示呼称(任意)。キーが重複して別フィールドを指すと衝突して検出できる。
fieldLabels: {
	"識別子": "id"
	"名称":  "preferredName"
	"定義":  "definition"
}

// 用語→{id,種別}。図・会話のラベル解決の原本。概念データから自動生成する。
vocabulary: {
	for _, x in <concepts> {
		(x.preferredName): {
			id:   x.id
			kind: "<kind>"
		}
	}
}

// 用語→{id,種別,定義}。用語表の元データ。definitionを集約する。
// 根拠(sources)を宣言した概念は、それも集約して用語表に出す。
glossary: {
	for _, x in <concepts> {
		(x.preferredName): {
			id:         x.id
			kind:       "<kind>"
			definition: x.definition
			if x.sources != _|_ {
				sources: x.sources
			}
		}
	}
}

// Quint定数の元になる既知idの一覧。
knownIds: [for _, x in <concepts> {x.id}]

// Quintの振る舞いモデルに現れるべき概念(行動の核)のid一覧。
// check-consistency は、ここに挙がった概念がQuintで未使用の場合だけ警告する。
// 構造専用(用語表・概念マップのみ)や投影専用(イベント等)の概念は挙げなくてよい。
quintExpected: [
	// "<行動の核となる概念のid>"
]

// 図示用の関係リスト {from, to, label}(関係がある場合)。
// 概念データの relations から集約する。関係が無ければ空リスト。
relations: list.Concat([
	for _, x in <concepts> {
		if x.relations != _|_ {
			[for r in x.relations {
				{
					from:  x.id
					to:    r.target
					label: r.type
				}
			}, ...]
		}
		if x.relations == _|_ {
			[]
		}
	},
])

// 参照整合性: 関係の target は既知idでなければならない(有する場合)。
// for _, x in <concepts> {
// 	if x.relations != _|_ {
// 		for i, r in x.relations {
// 			if !list.Contains(knownIds, r.target) {
// 				referenceErrors: "unknown target '\(r.target)'": true & false
// 			}
// 		}
// 	}
// }
