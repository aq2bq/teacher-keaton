package todo

// 負例: 同じidのタスクが2件ある保存値は拒否されなければならない。
// 拒否されないなら、重複排除の制約が緩すぎる。
duplicateIdStore: #TaskStore & {
	version: 1
	nextId:  3
	tasks: [
		{id: 1, title: "a", status: "backlog", createdAt: "2026-01-01T00:00:00.000Z"},
		{id: 1, title: "b", status: "backlog", createdAt: "2026-01-01T00:00:00.000Z"},
	]
}
