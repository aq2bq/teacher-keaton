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
// 測度(measures.cue)を宣言した場合は、測度と閾値も概念なので語彙に載せる
// (コメントを外す)。載せないと図のラベルが解決できず、整合検査が落ちる。
vocabulary: {
	for _, x in <concepts> {
		(x.preferredName): {
			id:   x.id
			kind: "<kind>"
		}
	}
	// for _, m in measures {
	// 	(m.preferredName): {id: m.id, kind: "measure"}
	// 	for _, t in m.thresholds {
	// 		(t.preferredName): {id: t.id, kind: "threshold"}
	// 	}
	// }
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
	// 測度を宣言した場合(用語表に測度も出す。極性と閾値は別に測度表が出す)。
	// for _, m in measures {
	// 	(m.preferredName): {
	// 		id:         m.id
	// 		kind:       "measure"
	// 		definition: m.definition
	// 		if m.sources != _|_ {sources: m.sources}
	// 	}
	// 	for _, t in m.thresholds {
	// 		(t.preferredName): {
	// 			id:         t.id
	// 			kind:       "threshold"
	// 			definition: t.meaning
	// 			if t.sources != _|_ {sources: t.sources}
	// 		}
	// 	}
	// }
}

// Quint定数の元になる既知idの一覧。
// 測度を宣言した場合は、測度と閾値のidも含める(閾値の定数と、極性から導出した
// 「悪い側を検出する」述語が constants.qnt に生成される)。
knownIds: [for _, x in <concepts> {x.id}]
// knownIds: list.Concat([
// 	[for _, x in <concepts> {x.id}],
// 	[for _, m in measures {m.id}],
// 	list.Concat([for _, m in measures {[for _, t in m.thresholds {t.id}]}]),
// ])

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
