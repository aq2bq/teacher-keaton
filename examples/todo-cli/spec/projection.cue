package todo

// 投影仕様: タスクの状態変化を「状態遷移」として意味づける。
// ナラティブ(参加者間の相互作用)ではないため、形式はシーケンス図でなく状態図。
// 同じ汎用エンジン+仕様の仕組みで、システムの構造に合う形式を選べる実例。

projection: {
	format: "stateDiagram"
	events: [
		{
			event: "add"
			when: [
				{kind: "setGains", var: "backlogTaskIds"},
				{kind: "intIncreases", var: "nextId"},
			]
			transition: {from: "[*]", to: "backlog", label: "add"}
		},
		{
			event: "start"
			when: [{kind: "move", from: "backlogTaskIds", to: "activeTaskIds"}]
			transition: {from: "backlog", to: "active", label: "start"}
		},
		{
			event: "done"
			when: [{kind: "move", from: "activeTaskIds", to: "doneTaskIds"}]
			transition: {from: "active", to: "done", label: "done"}
		},
		{
			event: "reopen"
			when: [{kind: "move", from: "doneTaskIds", to: "activeTaskIds"}]
			transition: {from: "done", to: "active", label: "reopen"}
		},
	]
}
