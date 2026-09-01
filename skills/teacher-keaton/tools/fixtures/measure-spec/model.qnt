// テスト専用の最小モデル。閾値との比較は生で書かず、
// constants.qnt に生成された述語(向きを名前に持つ)を使う。

module MeasureSpec {
  import MeasureSpecConstants.* from "./constants"

  var annoyance: int
  var alerted: bool

  action init: bool =
    annoyance' = 0 and alerted' = false

  action worsen: bool =
    annoyance < 10
    and annoyance' = annoyance + 1
    and alerted' = thresholdAnnoyanceHighIsWorseSide(annoyance + 1)

  action improve: bool =
    annoyance > 0
    and annoyance' = annoyance - 1
    and alerted' = thresholdAnnoyanceHighIsWorseSide(annoyance - 1)

  action step: bool = any { worsen, improve }

  /// 意味の不変条件: 「要対応」であることと、値が閾値の悪い側にあることは同値。
  val AlertMatchesWorseSide: bool =
    alerted == thresholdAnnoyanceHighIsWorseSide(annoyance)

  /// 動作テスト: 閾値の直前と直後で判定が変わる。
  run thresholdBoundaryTest = {
    init.then(worsen).then(worsen).then(all {
      assert(annoyance == 2),
      assert(not(alerted)),
      annoyance' = annoyance,
      alerted' = alerted,
    }).then(worsen).then(all {
      assert(annoyance == 3),
      assert(alerted),
      annoyance' = annoyance,
      alerted' = alerted,
    })
  }
}
