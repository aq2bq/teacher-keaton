package <name>

// 投影仕様: 「状態差分をどう意味づけるか」の宣言。
// 汎用ツール project/explain がこれを評価する。
// システムの構造に合う一方を選ぶ:
//   - ナラティブ(参加者間の相互作用) → message(シーケンス図)
//   - 状態機械(レコードの状態変化)   → transition(状態遷移図)

projection: {
	// 既定の形式: "sequenceDiagram" か "stateDiagram"
	format: "stateDiagram"

	events: [
		// ── 状態機械の例(状態遷移図) ─────────────────────────────
		// 要素が集合Aから集合Bへ移ったら、状態A→状態Bの遷移とみなす。
		{
			event: "<transition-name>"
			when: [{kind: "move", from: "<setA>", to: "<setB>"}]
			transition: {from: "<stateA>", to: "<stateB>", label: "<label>"}
		},

		// ── ナラティブの例(シーケンス図) ─────────────────────────
		// 集合に要素が加わり、かつ整数が減ったら、メッセージとみなす。
		// bind で捕まえた値を "$<bind>" で参照する。
		// {
		// 	event: "<message-name>"
		// 	when: [
		// 		{kind: "setGains", var: "<setVar>", bind: "to"},
		// 		{kind: "intDecreases", var: "<intVar>"},
		// 	]
		// 	message: {from: "<kind>-<from>", to: "$to", label: "<label>"}
		// },
	]
}

// 差分述語(when)の一覧:
//   setGains / setLoses / move / intDecreases / intIncreases / boolBecomes
// 詳細は docs/conventions.md。
