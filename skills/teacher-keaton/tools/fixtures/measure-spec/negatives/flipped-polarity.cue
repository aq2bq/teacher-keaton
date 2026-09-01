package measurespec

// 負例(意味のテスト): 小さい値を「悪い側」と読む解釈は拒否されなければならない。
// 拒否されないなら、極性がモデルのどこにも効いていない。
flippedCase: #MeasureVerdict & {
	measure:     measures.annoyance
	threshold:   measures.annoyance.thresholds[0]
	value:       1
	isWorseSide: true
}
