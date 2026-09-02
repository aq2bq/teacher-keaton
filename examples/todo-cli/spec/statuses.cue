package todo

// タスク状態と、状態を変えるコマンドの静的な関係。
statuses: {
	backlog: #Status & {
		id:            "backlog"
		preferredName: "未着手"
		definition:    "追加後、まだstartされていないタスクの状態。"
		origin:        "observed"
		relations: [{type: "start", target: "active"}]
		sources: [{location: "src/task.ts:1", note: "TASK_STATUSES"}]
	}

	active: #Status & {
		id:            "active"
		preferredName: "作業中"
		definition:    "start済みで、まだdoneされていないタスクの状態。"
		origin:        "observed"
		relations: [{type: "done", target: "done"}]
		sources: [{location: "src/task.ts:1", note: "TASK_STATUSES"}]
	}

	done: #Status & {
		id:            "done"
		preferredName: "完了済み"
		definition:    "done済みで、完了時刻を持つタスクの状態。"
		origin:        "observed"
		relations: [{type: "reopen", target: "active"}]
		sources: [{location: "src/task.ts:1", note: "TASK_STATUSES"}, {location: "src/task.ts:61", note: "completeTask が完了時刻を記録"}]
	}
}
