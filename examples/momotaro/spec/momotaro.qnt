// 桃太郎のきびだんご経済の最初のモデル。
// 目的: 状態・操作・invariant を最小の題材で一周すること。
// CUE(構造検証)と違い、こちらは時間とともに変化する振る舞いを扱う。
//
// 概念の参照は必ずCUEから生成された定数を使うこと。
// 文字列リテラルや日本語をこのファイルに書かない(検査対象: tools/check-consistency)。

module Momotaro {
  import MomotaroConstants.* from "./constants"

  // 道中で出会う動物たち
  pure val animals: Set[str] = Set(charDog, charMonkey, charPheasant)

  // 序章の段階(桃が流れる→拾う→生まれる→育つ→旅立つ)。
  // check-consistency が既知id以外の文字列リテラルを禁じるため、整数で表現する。
  pure val PHASE_PEACH_FLOATING: int = 0
  pure val PHASE_PEACH_COLLECTED: int = 1
  pure val PHASE_MOMOTARO_BORN: int = 2
  pure val PHASE_GROWN: int = 3
  pure val PHASE_JOURNEY: int = 4

  // 状態: 序章の段階、きびだんごの所持数、仲間の一覧、旅の段階、戦闘の結果、結末
  var prologueStep: int
  var dango: int
  var companions: Set[str]
  var departed: bool      // true = 鬼ヶ島へ旅立った(仲間集め終了)
  var oniDefeated: bool   // true = 鬼を退治した
  var momoLost: bool      // true = 桃太郎が鬼に敗れた
  var hasTreasure: bool   // true = 宝物を奪還した
  var returnedHome: bool  // true = 村へ帰還した

  /// 初期状態: 大きな桃が川を流れている。まだ何も起きていない。
  action init: bool =
    prologueStep' = PHASE_PEACH_FLOATING
    and dango' = 0
    and companions' = Set()
    and departed' = false
    and oniDefeated' = false
    and momoLost' = false
    and hasTreasure' = false
    and returnedHome' = false

  /// 1ステップ: 序章の進行・仲間集め・出発・戦闘・宝物奪還・帰還のいずれか。
  action step: bool = any {
    collectPeach, momotaroBorn, growUp, startJourney,
    giveSome, depart, defeatOni, defeatedByOni, claimTreasure, returnHome,
  }

  /// おばあさんが川から桃を拾う。
  action collectPeach: bool =
    prologueStep == PHASE_PEACH_FLOATING
    and prologueStep' = PHASE_PEACH_COLLECTED
    and dango' = dango
    and companions' = companions
    and departed' = departed
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome

  /// 桃から桃太郎が生まれる。
  action momotaroBorn: bool =
    prologueStep == PHASE_PEACH_COLLECTED
    and prologueStep' = PHASE_MOMOTARO_BORN
    and dango' = dango
    and companions' = companions
    and departed' = departed
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome

  /// 桃太郎が育つ。
  action growUp: bool =
    prologueStep == PHASE_MOMOTARO_BORN
    and prologueStep' = PHASE_GROWN
    and dango' = dango
    and companions' = companions
    and departed' = departed
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome

  /// おばあさんがきびだんごを作り、桃太郎が旅立つ。
  action startJourney: bool =
    prologueStep == PHASE_GROWN
    and prologueStep' = PHASE_JOURNEY
    and dango' = 3
    and companions' = companions
    and departed' = departed
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome

  /// 序章の全進行: 桃を拾う→生まれる→育つ→旅立つ。
  action prologue: bool =
    collectPeach.then(momotaroBorn).then(growUp).then(startJourney)

  action giveSome: bool = {
    nondet animal = oneOf(animals)
    all { give(animal) }
  }

  /// 鬼ヶ島へ出発する。仲間の人数は問わない(少数で出発する反実仮想も許す)。
  /// これにより「仲間なしで勝てるか」をモデルが探索できる。
  /// 出発後も自己遷移として有効にしておき、意図しないdeadlockを防ぐ。
  /// 序章を終えて旅立っていなければ出発できない。
  action depart: bool =
    prologueStep == PHASE_JOURNEY
    and dango' = dango
    and companions' = companions
    and departed' = true
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome
    and prologueStep' = prologueStep

  /// 鬼を退治して勝利する。仲間が1人以上いることが必要。
  action defeatOni: bool =
    departed
    and not(oniDefeated)
    and not(momoLost)
    and size(companions) >= 1
    and oniDefeated' = true
    and momoLost' = momoLost
    and dango' = dango
    and companions' = companions
    and departed' = departed
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome
    and prologueStep' = prologueStep

  /// 仲間なしで鬼に挑むと敗れる。
  action defeatedByOni: bool =
    departed
    and not(oniDefeated)
    and not(momoLost)
    and size(companions) == 0
    and momoLost' = true
    and oniDefeated' = oniDefeated
    and dango' = dango
    and companions' = companions
    and departed' = departed
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome
    and prologueStep' = prologueStep

  /// 鬼を退治した後、宝物を奪還する。
  action claimTreasure: bool =
    oniDefeated
    and not(momoLost)
    and not(hasTreasure)
    and hasTreasure' = true
    and returnedHome' = returnedHome
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and dango' = dango
    and companions' = companions
    and departed' = departed
    and prologueStep' = prologueStep

  /// 宝物を持って村へ帰還する。
  action returnHome: bool =
    hasTreasure
    and not(returnedHome)
    and returnedHome' = true
    and hasTreasure' = hasTreasure
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and dango' = dango
    and companions' = companions
    and departed' = departed
    and prologueStep' = prologueStep

  /// 物語で固定された出会い順: 犬 → 猿 → 雉。
  /// ある動物を仲間にするには、順序で先行する動物が全員すでに仲間である必要がある。
  /// 先行動物の集合を返す。犬は先頭なので空集合。
  pure def prereqs(animal: str): Set[str] =
    if (animal == charMonkey) Set(charDog)
    else if (animal == charPheasant) Set(charDog, charMonkey)
    else Set()

  /// きびだんごを1個消費して、動物を仲間に加える。
  /// だんごがない、すでに仲間である場合、出会い順に反する場合は不成立。
  action give(animal: str): bool =
    dango > 0
    and not(companions.contains(animal))
    and not(departed)
    and prereqs(animal).exclude(companions) == Set()
    and dango' = dango - 1
    and companions' = companions.union(Set(animal))
    and departed' = false
    and oniDefeated' = oniDefeated
    and momoLost' = momoLost
    and hasTreasure' = hasTreasure
    and returnedHome' = returnedHome
    and prologueStep' = prologueStep

  /// きびだんごは常に0個以上。
  val DangoNonNegative: bool = dango >= 0

  /// きびだんごを持てるのは序章を終えて旅立ってから。
  /// 桃が流れている・拾われた・生まれた・育った段階では所持できない。
  val DangoOnlyDuringJourney: bool =
    (dango > 0) implies (prologueStep == PHASE_JOURNEY)

  /// 仲間は3匹まで(犬・猿・雉)。
  val CompanionsAtMostThree: bool = size(companions) <= 3

  /// 仲間なしでは鬼に勝てない。勝利したなら必ず仲間が1人以上いる。
  /// 出発を仲間の人数で制約していないため、このinvariantは
  /// 仲間0人の状態も探索した上で勝利を禁じる、空虚でない制約になる。
  val NeverWinWithoutCompanions: bool =
    oniDefeated implies (size(companions) >= 1)

  /// 勝利と敗北は同時に成立しない。
  val WinLoseExclusive: bool =
    not(oniDefeated and momoLost)

  /// 宝物は鬼を退治した後でしか得られない。
  val TreasureRequiresVictory: bool =
    hasTreasure implies oniDefeated

  /// 帰還は宝物を得た後でしか起きない。
  val ReturnRequiresTreasure: bool =
    returnedHome implies hasTreasure

  /************ テスト: 物語の通しシナリオ ************/

  /// 序章: 桃を拾う→生まれる→育つ→旅立つ。旅立ち後はきびだんご3個を持つ。
  run prologueTest = {
    init.then(prologue)
    .then(all {
      assert(prologueStep == PHASE_JOURNEY),
      assert(dango == 3),
      prologueStep' = prologueStep,
      dango' = dango,
      companions' = companions,
      departed' = departed,
      oniDefeated' = oniDefeated,
      momoLost' = momoLost,
      hasTreasure' = hasTreasure,
      returnedHome' = returnedHome,
    })
  }

  /// 桃を拾う前に桃太郎は生まれない。
  run bornBeforeCollectedRejectedTest = {
    init.then(momotaroBorn).fail()
  }

  /// 育つ前に旅立てない(成長を飛ばせない)。
  run journeyBeforeGrownRejectedTest = {
    init.then(collectPeach).then(momotaroBorn).then(startJourney).fail()
  }

  /// 旅立つ前(きびだんごなし)は仲間に加えられない。
  run noGiveBeforeJourneyTest = {
    init.then(give(charDog)).fail()
  }

  /// 正順: 犬 → 猿 → 雉 の順で仲間にして出発する。
  /// 最終状態は assert で表明する(次状態の変数は固定しておく)。
  run momotaroStoryTest = {
    init.then(prologue).then(give(charDog)).then(give(charMonkey)).then(give(charPheasant)).then(depart)
    .then(all {
      assert(dango == 0),
      assert(companions == animals),
      assert(departed),
      dango' = dango,
      companions' = companions,
      departed' = departed,
      oniDefeated' = oniDefeated,
      momoLost' = momoLost,
      hasTreasure' = hasTreasure,
      returnedHome' = returnedHome,
      prologueStep' = prologueStep,
    })
  }

  /// 仲間を揃えて出発すれば鬼に勝てる(正典の物語の結末)。
  run winWithCompanionsTest = {
    init.then(prologue).then(give(charDog)).then(give(charMonkey)).then(give(charPheasant)).then(depart)
    .then(defeatOni)
    .then(all {
      assert(oniDefeated),
      assert(not(momoLost)),
      dango' = dango,
      companions' = companions,
      departed' = departed,
      oniDefeated' = oniDefeated,
      momoLost' = momoLost,
      hasTreasure' = hasTreasure,
      returnedHome' = returnedHome,
      prologueStep' = prologueStep,
    })
  }

  /// 物語の全弧: 仲間集め → 出発 → 鬼退治 → 宝物奪還 → 帰還。
  run fullStoryTest = {
    init.then(prologue).then(give(charDog)).then(give(charMonkey)).then(give(charPheasant)).then(depart)
    .then(defeatOni).then(claimTreasure).then(returnHome)
    .then(all {
      assert(returnedHome),
      assert(hasTreasure),
      assert(oniDefeated),
      assert(not(momoLost)),
      dango' = dango,
      companions' = companions,
      departed' = departed,
      oniDefeated' = oniDefeated,
      momoLost' = momoLost,
      hasTreasure' = hasTreasure,
      returnedHome' = returnedHome,
      prologueStep' = prologueStep,
    })
  }

  /// 鬼を倒さずに宝物は得られない。
  run noTreasureWithoutVictoryTest = {
    init.then(prologue).then(give(charDog)).then(depart).then(claimTreasure).fail()
  }

  /// 敗北した場合は宝物も帰還もない。
  run noReturnAfterLossTest = {
    init.then(prologue).then(depart).then(defeatedByOni).then(claimTreasure).fail()
  }

  /// 仲間なしで出発すると鬼に勝てない(敗れる)。
  run loseWithoutCompanionsTest = {
    init.then(prologue).then(depart).then(defeatedByOni)
    .then(all {
      assert(momoLost),
      assert(not(oniDefeated)),
      dango' = dango,
      companions' = companions,
      departed' = departed,
      oniDefeated' = oniDefeated,
      momoLost' = momoLost,
      hasTreasure' = hasTreasure,
      returnedHome' = returnedHome,
      prologueStep' = prologueStep,
    })
  }

  /// 仲間なしでは勝利の遷移自体が不成立。
  run cannotWinAloneTest = {
    init.then(prologue).then(depart).then(defeatOni).fail()
  }

  /// 出会い順に反する仲間の追加は拒否される。
  /// 物語では犬→猿→雉が固定なので、最初に雉を仲間にはできない。
  /// 穴を塞いだ後は、順不同を許していた旧モデルと異なり逆順は不成立になる。
  run reverseOrderRejectedTest = {
    init.then(prologue).then(give(charPheasant)).fail()
  }

  /// 順序を飛ばすこともできない(犬を飛ばして猿は不可)。
  run skipOrderRejectedTest = {
    init.then(prologue).then(give(charMonkey)).fail()
  }

  /// 同じ動物に2度だんごを与えることはできない。
  /// 2度目の give は不成立なので、fail() で「起きないこと」を表明する。
  run noDoubleGiveTest = {
    init.then(prologue).then(give(charDog)).then(give(charDog))
    .fail()
  }

  /// だんごを持たずに仲間を増やすことはできない(存在しない4匹目)。
  /// 動物は3種しかいないので、全員加入後の give はどの選択でも不成立。
  run noFourthCompanionTest = {
    init.then(prologue).then(give(charDog)).then(give(charMonkey)).then(give(charPheasant))
    .then(nondet extra = oneOf(animals) { give(extra) })
    .fail()
  }
}
