package measurespec

// 正例(意味のテスト): 極性から導出した判定が、仕様どおりの向きであること。
// 極性を higherIsBetter に取り違えると、この用例は矛盾して vet が落ちる。
worseCase: #MeasureVerdict & {
	measure:     measures.annoyance
	threshold:   measures.annoyance.thresholds[0]
	value:       5
	isWorseSide: true
}

betterCase: #MeasureVerdict & {
	measure:     measures.annoyance
	threshold:   measures.annoyance.thresholds[0]
	value:       1
	isWorseSide: false
}

// 閾値の値そのものは悪い側(inclusive: true)。
boundaryCase: #MeasureVerdict & {
	measure:     measures.annoyance
	threshold:   measures.annoyance.thresholds[0]
	value:       3
	isWorseSide: true
}
