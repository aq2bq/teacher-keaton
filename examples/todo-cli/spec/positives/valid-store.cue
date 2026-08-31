package todo

// 正例: 正しい形の保存値は検証を通過しなければならない。
// 通過しないなら、スキーマの制約が厳しすぎる。
goodStore: #TaskStore & {
	version: 1
	nextId:  3
	tasks: [
		{
			id:        1
			title:     "牛乳を買う"
			status:    "backlog"
			createdAt: "2026-01-01T00:00:00.000Z"
		},
		{
			id:          2
			title:       "報告書を書く"
			status:      "done"
			createdAt:   "2026-01-01T00:00:00.000Z"
			completedAt: "2026-01-02T00:00:00.000Z"
		},
	]
}
