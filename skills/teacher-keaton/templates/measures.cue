package <name>

// 測度(数値尺度)。数値を扱わないシステムでは、このファイルごと不要。
//
// 書く理由: 数値項目は「範囲」だけでは意味が決まらない。値が大きいほど良いのか
// 悪いのかという契約(極性)が別にあり、項目名からは推定できない。
// 「品質スコア」が実は「気になる度」を測っていて小さいほど良い、ということが起こる。
//
// 極性は必ず観測した根拠から決める。根拠になるもの:
//   - 閾値を超えたときの分岐先(警告・アラート・エスカレーション)
//   - 警告文やラベルの文言(「要対応」「良好」)
//   - ソート順(悪い順に並べているか)、色分け
//   - 集計での扱い(min を取るのか max を取るのか)
// どれも観測できない場合は polarity: "unresolved" とし、名前から決めない。
//
// 測度と閾値も概念なので、安定idと表示名を持ち、語彙(vocabulary.cue)に載せる。

measures: {
	<measureKey>: #Measure & {
		id:            "measure-<measureKey>"
		preferredName: "<表示名>"
		definition:    "<何を測っているか。名前ではなく実際に測っている量を書く>"
		origin:        "observed"
		sources: [{location: "<ファイル:行>", note: "<測度の名称または定義の観測位置>"}]
		unit?:         "<単位>"
		range: {min: 0, max: 100}

		// 大きいほど良いか、悪いか。名前から推定しない。
		polarity: "lowerIsBetter"
		polarityEvidence: [
			{location: "<ファイル:行>", note: "<そこで観測できる向きの根拠>"},
		]

		// 振る舞い(Quint)で保持する変数名(振る舞いをモデル化する場合)。
		quintVar: "<quint変数名>"

		thresholds: [
			#Threshold & {
				id:            "threshold-<measureKey>-<name>"
				preferredName: "<閾値の表示名>"
				origin:        "observed"
				at:            3
				// 閾値の値そのものを悪い側に含めるか(既定 true)。
				// 「3以上は要対応」は既定、「80未満は不合格」は inclusive: false。
				inclusive: true
				meaning:   "<超えたときに何を意味するか>"
				// entersState: "<超えたときに入る状態のid>"
				sources: [{location: "<ファイル:行>", note: "<閾値の観測位置>"}]
			},
		]
	}
}
