package todo

// タスクの状態を変えるイベント。イベントも概念であり、語彙の管理を受ける。
// 投影(projection.cue)のラベルは、ここに表示名を持たない。
// イベントのidから vocabulary が表示名を解決する。
events: {
	add: #Event & {
		id:            "event-add"
		preferredName: "タスクを追加"
		definition:    "新しいタスクを未着手状態で追加する。"
		sources: [{location: "src/task.ts:27", note: "addTask"}]
	}

	start: #Event & {
		id:            "event-start"
		preferredName: "タスクを開始"
		definition:    "タスクを未着手から作業中へ移す。"
		sources: [{location: "src/task.ts:54", note: "startTask"}]
	}

	done: #Event & {
		id:            "event-done"
		preferredName: "タスクを完了"
		definition:    "タスクを作業中から完了済みへ移し、完了時刻を記録する。"
		sources: [{location: "src/task.ts:61", note: "completeTask"}]
	}

	reopen: #Event & {
		id:            "event-reopen"
		preferredName: "タスクを再開"
		definition:    "タスクを完了済みから作業中へ戻す。"
		sources: [{location: "src/task.ts:71", note: "reopenTask"}]
	}
}
