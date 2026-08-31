package <name>

// 投影仕様: 「状態差分をどう意味づけるか」の宣言。
// 汎用ツール project/explain がこれを評価する。
// システムの構造に合う一方を選ぶ:
//   - ナラティブ(参加者間の相互作用) → message(シーケンス図)
//   - 状態機械(レコードの状態変化)   → transition(状態遷移図)
//
// ラベルは書かない: イベントも概念としてドメインファイルに宣言し、
// 表示名はイベントのidから語彙(vocabulary)が解決する。
// 図に出る語を語彙の管理外で再入力しないための規約。

projection: {
	// 既定の形式: "sequenceDiagram" か "stateDiagram"
	format: "stateDiagram"

	events: [
		// ── 状態機械の例(状態遷移図) ─────────────────────────────
		// 要素が集合Aから集合Bへ移ったら、状態A→状態Bの遷移とみなす。
		// event はCUEの既知id(概念として宣言したイベントのid)。
		{
			event: "<kind>-<event>"
			when: [{kind: "move", from: "<setA>", to: "<setB>"}]
			transition: {from: "<stateA>", to: "<stateB>"}
		},

		// ── ナラティブの例(シーケンス図) ─────────────────────────
		// 集合に要素が加わり、かつ整数が減ったら、メッセージとみなす。
		// bind で捕まえた値を "$<bind>" で参照する。
		// {
		// 	event: "<kind>-<event>"
		// 	when: [
		// 		{kind: "setGains", var: "<setVar>", bind: "to"},
		// 		{kind: "intDecreases", var: "<intVar>"},
		// 	]
		// 	message: {from: "<kind>-<from>", to: "$to"}
		// },
	]
}

// 差分述語(when)の一覧:
//   setGains        集合に要素が加わった      (bind: 加わった要素)
//   setLoses        集合から要素が減った      (bind: 減った要素)
//   move            要素が集合A→Bへ移った     (bind: 移った要素)
//   intDecreases    整数が減った / intIncreases 整数が増えた
//   boolBecomes     ブールが指定値に変わった
