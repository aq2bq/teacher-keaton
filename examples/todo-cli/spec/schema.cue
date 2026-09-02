package todo

import (
	"list"
	"strings"
	"time"
)

// 構造検証のスキーマ層: CLIが読込後に正規化して扱う保存値を検査する。

// JavaScriptの安全整数として扱える正整数。
#PositiveSafeInteger: int & >0 & <=9007199254740991

// タスクの状態。値は src/task.ts の TASK_STATUSES と一致させる。
#TaskStatus: "backlog" | "active" | "done"

// タイトルの文字列型。空白除去後の長さは #Task 内で検査する。
#TaskTitle: string

// Bunが保存する Date.toISOString() の通常年形式。
// time.Format で存在する日時かを、正規表現でミリ秒3桁のUTC表記かを検査する。
#Timestamp: time.Format(time.RFC3339Nano) &
	=~"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$"

// CLIが読み書きする1件のタスク記録。
// completedAt は done のときだけ必須で、それ以外の状態では許可しない。
#Task: {
	id:             #PositiveSafeInteger @ja(識別子)
	title:          #TaskTitle           @ja(タイトル)
	status:         #TaskStatus          @ja(状態)
	createdAt:      #Timestamp           @ja(作成時刻)
	_titleNonEmpty: (len(strings.TrimSpace(title)) > 0) & true

	if status == "done" {
		completedAt: #Timestamp & >=createdAt @ja(完了時刻)
	}
	if status != "done" {
		completedAt?: _|_ @ja(完了時刻)
	}
}

// .todo.json から正規化される保存値全体。
// 各タスクIDは重複せず、常に nextId より小さい。
#TaskStore: {
	version: 1                    @ja(保存形式バージョン)
	nextId:  #PositiveSafeInteger @ja(次回識別子)
	tasks: [...#Task] @ja(タスク一覧)

	_ids: [for _, task in tasks {task.id}]
	_idsUnique: true & list.UniqueItems(_ids)
	_idsBelowNextId: [for _, id in _ids {id & <nextId}]
}

// 保存ファイルが存在しない場合に loadStore が返す値。
emptyStore: #TaskStore & {
	version: 1
	nextId:  1
	tasks: []
}

// 状態を語彙・状態遷移図のノードとして扱うための記録。
#Status: #ConceptProvenance & {
	id:            #TaskStatus @ja(識別子)
	preferredName: string      @ja(名称)
	definition:    string      @ja(定義)
	relations?: [...#StatusTransition] @ja(状態遷移)
}

// 実装が許す状態変更。target は既知の状態IDを指す。
#StatusTransition: {
	type:   "start" | "done" | "reopen" @ja(コマンド)
	target: #TaskStatus                 @ja(遷移先)
}

// タスクの状態を変えるイベント。イベントも概念であり、語彙の管理を受ける。
// 投影のラベルはイベントのidから表示名へ解決され、自由記述しない。
#Event: #ConceptProvenance & {
	id:            string @ja(識別子)
	preferredName: string @ja(名称)
	definition:    string @ja(定義)
}

// 根拠。観測事実(実装が現に行うこと)をどこで観測したか。
// 位置は自由形式の表記(ファイル:行番号、文書の節等)。
#ConceptOrigin: "observed" | "inferred"

#ConceptProvenance: {
	origin:  #ConceptOrigin @ja(由来)
	sources: [#Source, ...#Source] @ja(観測位置)
	if origin == "inferred" {
		inferenceReason: string & !="" @ja(推論理由)
	}
	if origin == "observed" {
		inferenceReason?: _|_ @ja(推論理由)
	}
	...
}

#Source: {
	location: string & !="" @ja(位置)
	note?:    string @ja(注記)
}
