package momotaro

// 投影仕様: 「状態差分をどう意味づけるか」の宣言。
// 参加者・ラベルの語彙は vocabulary が原本であり、ここでは
// 「どの状態変化が・誰から誰への・何というイベントか」だけを記述する。
// このファイルが旧 gen-sequence-diagram に焼き込まれていた意味解釈の置き場所。

projection: {
	format: "sequenceDiagram"
	events: [
		{
			event: "give"
			when: [
				{kind: "setGains", var: "companions", bind: "to"},
				{kind: "intDecreases", var: "dango"},
			]
			message: {from: "char-momo", to: "$to", label: "きびだんごを与える"}
		},
		{
			event: "depart"
			when: [{kind: "boolBecomes", var: "departed", value: true}]
			message: {from: "char-momo", to: "char-momo", label: "鬼ヶ島へ出発"}
		},
	]
}
