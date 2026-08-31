package todo

// 投影仕様: タスクの状態変化を「状態遷移」として意味づける。
// ナラティブ(参加者間の相互作用)ではないため、形式はシーケンス図でなく状態図。
// 同じ汎用エンジン+仕様の仕組みで、システムの構造に合う形式を選べる実例。
// ラベルは書かない: イベントのidから語彙が表示名を解決する。

projection: {
	format: "stateDiagram"
	events: [
		{
			event: "event-add"
			when: [
				{kind: "setGains", var: "backlogTaskIds"},
				{kind: "intIncreases", var: "nextId"},
			]
			transition: {from: "[*]", to: "backlog"}
		},
		{
			event: "event-start"
			when: [{kind: "move", from: "backlogTaskIds", to: "activeTaskIds"}]
			transition: {from: "backlog", to: "active"}
		},
		{
			event: "event-done"
			when: [{kind: "move", from: "activeTaskIds", to: "doneTaskIds"}]
			transition: {from: "active", to: "done"}
		},
		{
			event: "event-reopen"
			when: [{kind: "move", from: "doneTaskIds", to: "activeTaskIds"}]
			transition: {from: "done", to: "active"}
		},
		// 状態を変えない事象(拒否)の例: 観測ログへの記録として検出し、
		// 作業中状態の自己遷移として描く。
		{
			event: "event-reject-start-busy"
			when: [{kind: "sequenceAppends", var: "observedEvents", value: "event-reject-start-busy"}]
			transition: {from: "active", to: "active"}
		},
	]
}
