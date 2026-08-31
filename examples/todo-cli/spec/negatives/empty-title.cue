package todo

// 負例: 空白のみのタイトルのタスクは拒否されなければならない。
// 拒否されないなら、タイトル検査の制約が緩すぎる。
emptyTitleStore: #TaskStore & {
	version: 1
	nextId:  2
	tasks: [
		{id: 1, title: "   ", status: "backlog", createdAt: "2026-01-01T00:00:00.000Z"},
	]
}
