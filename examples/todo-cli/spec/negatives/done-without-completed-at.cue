package todo

// 負例: 完了時刻の無い done タスクは拒否されなければならない。
// 拒否されないなら、完了時刻必須の制約が緩すぎる。
doneWithoutCompletedAtStore: #TaskStore & {
	version: 1
	nextId:  2
	tasks: [
		{id: 1, title: "a", status: "done", createdAt: "2026-01-01T00:00:00.000Z"},
	]
}
