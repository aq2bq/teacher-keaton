package measurespec

import "list"

// テスト専用の最小spec(測度つき)。模倣対象の手本ではない
// (完全なspecの形は templates/ を参照)。
// 「気になる度」という、名前からは向きを取り違えやすい尺度を題材にする。

#Source: {
	location: string & !=""
	note?:    string
}

#ConceptOrigin: "observed" | "inferred"

#ConceptProvenance: {
	origin:  #ConceptOrigin
	sources: [#Source, ...#Source]
	if origin == "inferred" {
		inferenceReason: string & !=""
	}
	if origin == "observed" {
		inferenceReason?: _|_
	}
	...
}

#Polarity: "higherIsBetter" | "lowerIsBetter" | "neutral" | "unresolved"

#Measure: #ConceptProvenance & {
	id:            string
	preferredName: string
	definition:    string
	unit?:         string
	polarity:      #Polarity
	range: {
		min?: number
		max?: number
	}
	if polarity != "unresolved" {
		polarityEvidence: [#Source, ...#Source]
	}
	if polarity == "unresolved" {
		unresolvedNote: string
	}
	quintVar?: string
	thresholds?: [...#Threshold]
}

#Threshold: #ConceptProvenance & {
	id:            string
	preferredName: string
	at:            number
	inclusive:     bool | *true
	meaning:       string
	entersState?:  string
}

// 極性から比較の向きを導出する。用例(positives/negatives)はこれを通す。
#MeasureVerdict: {
	measure:   #Measure
	threshold: #Threshold
	value:     number

	isWorseSide: bool
	if measure.polarity == "lowerIsBetter" {
		if threshold.inclusive {isWorseSide: value >= threshold.at}
		if !threshold.inclusive {isWorseSide: value > threshold.at}
	}
	if measure.polarity == "higherIsBetter" {
		if threshold.inclusive {isWorseSide: value <= threshold.at}
		if !threshold.inclusive {isWorseSide: value < threshold.at}
	}
}

#Concept: #ConceptProvenance & {
	id:            string
	preferredName: string
	definition:    string
}

states: {
	calm: #Concept & {
		id:            "calm"
		preferredName: "平穏"
		definition:    "気になる度が閾値の良い側にある状態。"
		origin:        "inferred"
		sources: [{location: "src/alert.ts:12", note: "要対応の閾値より良い側"}]
		inferenceReason: "閾値の良い側を状態遷移図の状態として表すため。"
	}
	alert: #Concept & {
		id:            "alert"
		preferredName: "要対応"
		definition:    "気になる度が閾値の悪い側にある状態。"
		origin:        "inferred"
		sources: [{location: "src/alert.ts:12", note: "閾値以上で警告する"}]
		inferenceReason: "閾値の悪い側を状態遷移図の状態として表すため。"
	}
}

events: {
	worsen: #Concept & {
		id:            "event-worsen"
		preferredName: "気になり度が上がる"
		definition:    "気になる度が増える(小さいほど良い尺度なので悪化)。"
		origin:        "inferred"
		sources: [{location: "src/alert.ts:12", note: "値が大きいほど警告側へ近づく"}]
		inferenceReason: "測度の増加を投影可能なイベントとして表すため。"
	}
	enterAlert: #Concept & {
		id:            "event-enter-alert"
		preferredName: "要対応になる"
		definition:    "気になる度が閾値の悪い側へ入る。"
		origin:        "inferred"
		sources: [{location: "src/alert.ts:12", note: "閾値以上で要対応になる"}]
		inferenceReason: "閾値を跨ぐ変化を投影可能なイベントとして表すため。"
	}
}

measures: {
	annoyance: #Measure & {
		id:            "measure-annoyance"
		preferredName: "気になる度"
		definition:    "利用者が気にしている度合い。名前は肯定的だが、測っているのは困りごとの強さ。"
		origin:        "observed"
		sources: [{location: "src/alert.ts:12", note: "値を警告判定に使う"}]
		polarity:      "lowerIsBetter"
		range: {min: 0, max: 10}
		polarityEvidence: [
			{location: "src/alert.ts:12", note: "値が大きいときに警告を出す"},
		]
		quintVar: "annoyance"
		thresholds: [
			#Threshold & {
				id:            "threshold-annoyance-high"
				preferredName: "要対応の閾値"
				origin:        "observed"
				at:            3
				inclusive:     true
				meaning:       "要対応として扱う"
				entersState:   "alert"
				sources: [{location: "src/alert.ts:12"}]
			},
		]
	}
}

vocabulary: {
	for _, x in states {
		(x.preferredName): {id: x.id, kind: "status"}
	}
	for _, x in events {
		(x.preferredName): {id: x.id, kind: "event"}
	}
	for _, m in measures {
		(m.preferredName): {id: m.id, kind: "measure"}
		for _, t in m.thresholds {
			(t.preferredName): {id: t.id, kind: "threshold"}
		}
	}
}

glossary: {
	for _, x in states {
		(x.preferredName): {
			id: x.id, kind: "status", definition: x.definition
			origin: x.origin, sources: x.sources
			if x.origin == "inferred" {inferenceReason: x.inferenceReason}
		}
	}
	for _, x in events {
		(x.preferredName): {
			id: x.id, kind: "event", definition: x.definition
			origin: x.origin, sources: x.sources
			if x.origin == "inferred" {inferenceReason: x.inferenceReason}
		}
	}
	for _, m in measures {
		(m.preferredName): {
			id: m.id, kind: "measure", definition: m.definition
			origin: m.origin, sources: m.sources
			if m.origin == "inferred" {inferenceReason: m.inferenceReason}
		}
		for _, t in m.thresholds {
			(t.preferredName): {
				id: t.id, kind: "threshold", definition: t.meaning
				origin: t.origin, sources: t.sources
				if t.origin == "inferred" {inferenceReason: t.inferenceReason}
			}
		}
	}
}

knownIds: list.Concat([
	[for _, x in states {x.id}],
	[for _, x in events {x.id}],
	[for _, m in measures {m.id}],
	list.Concat([for _, m in measures {[for _, t in m.thresholds {t.id}]}]),
])

quintExpected: ["measure-annoyance", "threshold-annoyance-high"]

relations: []
