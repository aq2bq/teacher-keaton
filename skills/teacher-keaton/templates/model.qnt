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
  /// 頂層の `val <Name>: bool` は tools/verify がすべて抽出して検証する。
  /// 補助の補題は def / pure def で書く(不変条件として抽出されない)。
  /// 例: 「各要素は同時に一つの状態にのみ属する」
  val <InvariantName>: bool =
    <stateA>Ids.intersect(<stateB>Ids) == Set()

  /************ シナリオテスト(名前は Test で終わらせる) ************/

  /// 代表的な筋。宣言(期待する振る舞い)になる。
  run <scenario>Test = {
    init.then(<transition>(1)).then(all {
      assert(<stateB>Ids == Set(1)),
      <stateA>Ids' = <stateA>Ids,
      <stateB>Ids' = <stateB>Ids,
      nextId' = nextId,
    })
  }
}
