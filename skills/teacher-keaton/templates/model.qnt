// <システム名> の振る舞いモデル。
// 状態・遷移・不変条件を記述する。文字列リテラルは使わず、
// gen-quint-constants が生成する constants.qnt の定数を参照する。

module <Name> {
  import <Name>Constants.* from "./constants"

  // 状態変数: システムの本質的な状態のみ。2つのパターンがある。

  // パターンA(エンティティの实例): 实例は nextId が作る int のid。
  // 「各状態に属するidの集合」で表すと move 述語と相性が良い。
  var <stateA>Ids: Set[int]
  var <stateB>Ids: Set[int]
  var nextId: int

  // パターンB(概念の集合): 集合の要素そのものが概念(状態・登場人物等)なら、
  // constants.qnt の定数(str)を保持する。文字列リテラルは直接書かない。
  // var <setVar>: Set[str]
  //   例: <setVar>' = <setVar>.union(Set(<constantName>))

  // パターンC(測度): 数値尺度は int で保持する。閾値との比較を生で書かず、
  // constants.qnt に生成された述語を使う。述語の名前(IsWorseSide /
  // IsBetterSide)が「その比較がどちら側を検出するか」を残すため、
  // 項目名の印象で向きを取り違えても検査で気づける。
  // var <measureVar>: int
  // var <flagVar>: bool
  //   例: <flagVar>' = <thresholdName>IsWorseSide(<measureVar>')

  /// 初期状態。
  action init: bool =
    <stateA>Ids' = Set()
    and <stateB>Ids' = Set()
    and nextId' = 1

  /// 1ステップ: いずれかの遷移。
  action step: bool = any { <transitionSome> }

  /// 遷移(ガード付き)。ガードが「許される振る舞い」を定義する。
  action <transition>(id: int): bool =
    <stateA>Ids.contains(id)
    and <stateA>Ids' = <stateA>Ids.exclude(Set(id))
    and <stateB>Ids' = <stateB>Ids.union(Set(id))
    and nextId' = nextId

  action <transitionSome>: bool = {
    nondet id = oneOf(<stateA>Ids)
    all { <transition>(id) }
  }

  /// 不変条件: 常に成り立つこと。モデルの主張。
  /// 測度を持つ場合は、動作(閾値の前後で結果が変わる)と意味(極性と閾値の
  /// 解釈が仕様と一致する)を分けて主張する。意味の主張は不変条件で書く:
  // val <FlagMatchesThreshold>: bool =
  //   <flagVar> == <thresholdName>IsWorseSide(<measureVar>)

  /// 頂層の `val <Name>: bool` は tools/verify がすべて抽出して検証する。
  /// 補助の補題は def / pure def で書く(不変条件として抽出されない)。
  /// 例: 「各要素は同時に一つの状態にのみ属する」
  val <InvariantName>: bool =
    <stateA>Ids.intersect(<stateB>Ids) == Set()

  /************ シナリオテスト(名前は Test で終わらせる) ************/

  /// 代表的な筋。宣言(期待する振る舞い)になる。
  /// 測度の動作テストは、閾値の直前と直後で判定が変わることを見る
  /// (閾値の値そのものがどちら側かも、ここで固定する)。
  run <scenario>Test = {
    init.then(<transition>(1)).then(all {
      assert(<stateB>Ids == Set(1)),
      <stateA>Ids' = <stateA>Ids,
      <stateB>Ids' = <stateB>Ids,
      nextId' = nextId,
    })
  }
}
