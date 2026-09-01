package measurespec

// 増減ではなく「悪化」「閾値を跨ぐ」で書く。増加が悪化かどうかは
// CUEの極性から解決されるため、投影に向きを書かない。
projection: {
	format: "stateDiagram"
	events: [
		{
			event: "event-worsen"
			when: [{kind: "measureWorsens", var: "annoyance", measure: "measure-annoyance"}]
			transition: {from: "calm", to: "calm"}
		},
		{
			event: "event-enter-alert"
			when: [{
				kind:      "measureEntersWorseSide"
				var:       "annoyance"
				measure:   "measure-annoyance"
				threshold: "threshold-annoyance-high"
			}]
			transition: {from: "calm", to: "alert"}
		},
	]
}
