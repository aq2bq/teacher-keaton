package todo

import "list"

// CUEを表示語彙とstable idの原本にする。

// 属性名の日本語呼称。キーが重複して別のフィールドを指すとunificationが衝突する。
fieldLabels: {
	"保存形式バージョン": "version"
	"次回識別子":     "nextId"
	"タスク一覧":     "tasks"
	"識別子":       "id"
	"タイトル":      "title"
	"状態":        "status"
	"作成時刻":      "createdAt"
	"完了時刻":      "completedAt"
	"名称":        "preferredName"
	"定義":        "definition"
	"状態遷移":      "relations"
	"コマンド":      "type"
	"遷移先":       "target"
	"根拠":        "sources"
	"位置":        "location"
	"注記":        "note"
}

// 状態変更コマンドの表示名。
relationTypeLabels: {
	"開始": "start"
	"完了": "done"
	"再開": "reopen"
}

// 状態の表示名から保存値への辞書は statuses から生成し、二重管理しない。
// イベントも概念として語彙に含める(投影のラベル解決の原本)。
vocabulary: {
	for _, status in statuses {
		(status.preferredName): {
			id:   status.id
			kind: "status"
		}
	}
	for _, event in events {
		(event.preferredName): {
			id:   event.id
			kind: "event"
		}
	}
}

// グロッサリー(用語表)。vocabulary に定義を加えたもので、
// 人間が読む解説書や学習ツールの材料になる。定義は statuses / events の
// ものを集約し、二重管理しない。
glossary: {
	for _, status in statuses {
		(status.preferredName): {
			id:         status.id
			kind:       "status"
			definition: status.definition
			if status.sources != _|_ {
				sources: status.sources
			}
		}
	}
	for _, event in events {
		(event.preferredName): {
			id:         event.id
			kind:       "event"
			definition: event.definition
			if event.sources != _|_ {
				sources: event.sources
			}
		}
	}
}

// Quintの文字列定数はこのリストだけから生成する。
knownIds: list.Concat([
	[for _, status in statuses {status.id}],
	[for _, event in events {event.id}],
])

// Quintの振る舞いモデルに現れるべき概念。状態は行動の核なので全状態を挙げる。
// イベントは投影専用なので挙げない(挙げるのは構造・投影専用でない概念だけ)。
quintExpected: [for _, status in statuses {status.id}]

// 状態遷移のtargetが既知の状態IDを指すことを検査する。
for name, status in statuses {
	if status.relations != _|_ {
		for index, relation in status.relations {
			if !list.Contains(knownIds, relation.target) {
				referenceErrors: "\(name).relations[\(index)]: unknown target '\(relation.target)'": true & false
			}
		}
	}
}

// gen-mermaid-diagram が読める {from, to, label} へ投影する。
jaLabelOf: {
	for ja, command in relationTypeLabels {
		(command): ja
	}
}

relations: list.Concat([
	for _, status in statuses {
		if status.relations != _|_ {
			[for relation in status.relations {
				{
					from:  status.id
					to:    relation.target
					label: jaLabelOf[relation.type]
				}
			}, ...]
		}
		if status.relations == _|_ {
			[]
		}
	},
])
