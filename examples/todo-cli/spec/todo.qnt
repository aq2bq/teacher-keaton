// TODO CLIの永続化されたタスク集合を、コマンド単位の状態遷移として表す。
// CUEが構造と語彙を担当し、このモデルは状態ごとのID集合とID発行履歴を担当する。
// 状態値は必ずCUEのknownIdsから生成された定数を使う。

module Todo {
  import TodoCliConstants.* from "./constants"

  pure val MAX_SAFE_INTEGER: int = 9007199254740991

  // 現在のタスクは状態別の集合で表す。時刻フィールドは値ではなく存在するIDを追跡する。
  var nextId: int
  var issuedIds: Set[int] // 保存値にはない、削除済みIDを含む証明用の履歴
  var backlogTaskIds: Set[int]
  var activeTaskIds: Set[int]
  var doneTaskIds: Set[int]
  var createdAtTaskIds: Set[int]
  var completedAtTaskIds: Set[int]
  // 観測専用のログ。拒否のようにドメイン状態を変えない事象を記録する。
  // ドメインの状態ではないので、不変条件には使わない。
  var observedEvents: List[str]

  /// 3状態のいずれかに属する、現在存在するタスクのID。
  val currentTaskIds: Set[int] =
    backlogTaskIds.union(activeTaskIds).union(doneTaskIds)

  /// 保存ファイルが存在しない場合と同じ空の初期状態。
  action init: bool =
    nextId' = 1
    and issuedIds' = Set()
    and backlogTaskIds' = Set()
    and activeTaskIds' = Set()
    and doneTaskIds' = Set()
    and createdAtTaskIds' = Set()
    and completedAtTaskIds' = Set()
    and observedEvents' = List()

  /// 1ステップ: 成功する変更コマンド・読み取りコマンド・拒否の記録のいずれか。
  action step: bool = any {
    addTask(true), startSomeTask, completeSomeTask, reopenSomeTask,
    removeSomeTask, listAllTasks, listTasks(backlog), listTasks(active),
    listTasks(done), showSomeTask, attemptStartBusySomeTask,
  }

  /// 保存値を変えない読み取り操作で使う自己遷移。
  action keepStore: bool =
    nextId' = nextId
    and issuedIds' = issuedIds
    and backlogTaskIds' = backlogTaskIds
    and activeTaskIds' = activeTaskIds
    and doneTaskIds' = doneTaskIds
    and createdAtTaskIds' = createdAtTaskIds
    and completedAtTaskIds' = completedAtTaskIds
    and observedEvents' = observedEvents

  /// 空白を除いたタイトルが空でなければ、nextIdでbacklogタスクを追加する。
  /// タイトル文字列そのものはCUEの#TaskTitleが検査し、ここでは前提の真偽だけを扱う。
  action addTask(titleIsNonEmpty: bool): bool =
    titleIsNonEmpty
    and not(issuedIds.contains(nextId))
    and nextId < MAX_SAFE_INTEGER
    and nextId' = nextId + 1
    and issuedIds' = issuedIds.union(Set(nextId))
    and backlogTaskIds' = backlogTaskIds.union(Set(nextId))
    and activeTaskIds' = activeTaskIds
    and doneTaskIds' = doneTaskIds
    and createdAtTaskIds' = createdAtTaskIds.union(Set(nextId))
    and completedAtTaskIds' = completedAtTaskIds
    and observedEvents' = observedEvents

  /// backlogタスクだけをactiveへ移す。
  action startTask(id: int): bool =
    backlogTaskIds.contains(id)
    and nextId' = nextId
    and issuedIds' = issuedIds
    and backlogTaskIds' = backlogTaskIds.exclude(Set(id))
    and activeTaskIds' = activeTaskIds.union(Set(id))
    and doneTaskIds' = doneTaskIds
    and createdAtTaskIds' = createdAtTaskIds
    and completedAtTaskIds' = completedAtTaskIds
    and observedEvents' = observedEvents

  /// activeタスクだけをdoneへ移し、completedAtが存在する状態にする。
  action completeTask(id: int): bool =
    activeTaskIds.contains(id)
    and nextId' = nextId
    and issuedIds' = issuedIds
    and backlogTaskIds' = backlogTaskIds
    and activeTaskIds' = activeTaskIds.exclude(Set(id))
    and doneTaskIds' = doneTaskIds.union(Set(id))
    and createdAtTaskIds' = createdAtTaskIds
    and completedAtTaskIds' = completedAtTaskIds.union(Set(id))
    and observedEvents' = observedEvents

  /// doneタスクだけをactiveへ戻し、completedAtを取り除く。
  action reopenTask(id: int): bool =
    doneTaskIds.contains(id)
    and nextId' = nextId
    and issuedIds' = issuedIds
    and backlogTaskIds' = backlogTaskIds
    and activeTaskIds' = activeTaskIds.union(Set(id))
    and doneTaskIds' = doneTaskIds.exclude(Set(id))
    and createdAtTaskIds' = createdAtTaskIds
    and completedAtTaskIds' = completedAtTaskIds.exclude(Set(id))
    and observedEvents' = observedEvents

  /// 現在存在するタスクを状態に関係なく除き、発行済みIDとnextIdは残す。
  action removeTask(id: int): bool =
    currentTaskIds.contains(id)
    and nextId' = nextId
    and issuedIds' = issuedIds
    and backlogTaskIds' = backlogTaskIds.exclude(Set(id))
    and activeTaskIds' = activeTaskIds.exclude(Set(id))
    and doneTaskIds' = doneTaskIds.exclude(Set(id))
    and createdAtTaskIds' = createdAtTaskIds.exclude(Set(id))
    and completedAtTaskIds' = completedAtTaskIds.exclude(Set(id))
    and observedEvents' = observedEvents

  /// 作業中(active)のタスクを再び開始しようとした試みは拒否され、
  /// 観測ログへ記録される。ドメイン状態は一切変えない。
  /// 拒否を「不可能(.fail())」ではなく「記録される事象」として表すことで、
  /// 状態を変えない事象も投影で図へ出せる。
  action attemptStartBusyTask(id: int): bool =
    activeTaskIds.contains(id)
    and nextId' = nextId
    and issuedIds' = issuedIds
    and backlogTaskIds' = backlogTaskIds
    and activeTaskIds' = activeTaskIds
    and doneTaskIds' = doneTaskIds
    and createdAtTaskIds' = createdAtTaskIds
    and completedAtTaskIds' = completedAtTaskIds
    and observedEvents' = observedEvents.append(eventRejectStartBusy)

  /// 全タスクの一覧表示。保存値は変えない。
  action listAllTasks: bool = keepStore

  /// CUEが列挙した既知の状態で絞り込む一覧表示。保存値は変えない。
  action listTasks(status: str): bool =
    knownIds.contains(status)
    and keepStore

  /// 現在存在するIDの詳細表示。保存値は変えない。
  action showTask(id: int): bool =
    currentTaskIds.contains(id)
    and keepStore

  action startSomeTask: bool = {
    nondet id = oneOf(backlogTaskIds)
    all { startTask(id) }
  }

  action completeSomeTask: bool = {
    nondet id = oneOf(activeTaskIds)
    all { completeTask(id) }
  }

  action reopenSomeTask: bool = {
    nondet id = oneOf(doneTaskIds)
    all { reopenTask(id) }
  }

  action removeSomeTask: bool = {
    nondet id = oneOf(currentTaskIds)
    all { removeTask(id) }
  }

  action showSomeTask: bool = {
    nondet id = oneOf(currentTaskIds)
    all { showTask(id) }
  }

  action attemptStartBusySomeTask: bool = {
    nondet id = oneOf(activeTaskIds)
    all { attemptStartBusyTask(id) }
  }

  /// 3つの状態集合は重ならず、現存タスクは正確に1状態だけを持つ。
  val TaskHasExactlyOneStatus: bool =
    size(currentTaskIds)
      == size(backlogTaskIds) + size(activeTaskIds) + size(doneTaskIds)

  /// 発行済みIDは1からnextId未満までを欠けなく表す。
  val IssuedIdsMatchNextId: bool =
    nextId > 0
    and nextId <= MAX_SAFE_INTEGER
    and size(issuedIds) == nextId - 1
    and issuedIds.forall(id => id > 0 and id < nextId)

  /// 現在存在するタスクIDは、過去に発行したIDだけである。
  val CurrentTaskIdsWereIssued: bool =
    currentTaskIds.exclude(issuedIds) == Set()

  /// 現在存在する全タスクがcreatedAtを持ち、削除済みタスクには残さない。
  val CreatedAtForEveryCurrentTask: bool =
    createdAtTaskIds == currentTaskIds

  /// completedAtが存在することとdone状態が双方向に一致する。
  val CompletedAtExactlyWhenDone: bool =
    completedAtTaskIds == doneTaskIds

  /************ テスト: コマンドの成立条件と保存値への効果 ************/

  /// 最初の追加はID 1を使い、backlogとcreatedAtの存在を記録する。
  run addTaskTest = {
    init.then(addTask(true)).then(all {
      assert(nextId == 2),
      assert(issuedIds == Set(1)),
      assert(backlogTaskIds == Set(1)),
      assert(createdAtTaskIds == Set(1)),
      assert(completedAtTaskIds == Set()),
      keepStore,
    })
  }

  /// 空白だけのタイトルを表すfalseでは追加できない。
  run emptyTitleRejectedTest = {
    init.then(addTask(false)).fail()
  }

  /// backlogからactiveを経てdoneになり、完了時刻が存在する。
  run completeTaskTest = {
    init.then(addTask(true)).then(startTask(1)).then(completeTask(1)).then(all {
      assert(doneTaskIds == Set(1)),
      assert(activeTaskIds == Set()),
      assert(completedAtTaskIds == Set(1)),
      keepStore,
    })
  }

  /// doneをreopenするとactiveへ戻り、完了時刻を取り除く。
  run reopenTaskTest = {
    init.then(addTask(true)).then(startTask(1)).then(completeTask(1)).then(reopenTask(1)).then(all {
      assert(activeTaskIds == Set(1)),
      assert(doneTaskIds == Set()),
      assert(completedAtTaskIds == Set()),
      keepStore,
    })
  }

  /// backlogから直接doneへは移せない。
  run doneFromBacklogRejectedTest = {
    init.then(addTask(true)).then(completeTask(1)).fail()
  }

  /// 一度startしたactiveタスクを再びstartすることはできない。
  run startTwiceRejectedTest = {
    init.then(addTask(true)).then(startTask(1)).then(startTask(1)).fail()
  }

  /// 作業中タスクの再開始の試みは拒否され、観測ログに記録される。
  /// ドメイン状態は変わらない(.fail()方式のstartTwiceRejectedTestと対比)。
  run busyStartRecordedTest = {
    init.then(addTask(true)).then(startTask(1)).then(attemptStartBusyTask(1)).then(all {
      assert(observedEvents == List(eventRejectStartBusy)),
      assert(activeTaskIds == Set(1)),
      keepStore,
    })
  }

  /// 削除したID 1は再利用せず、次の追加にID 2を使う。
  run removedIdNotReusedTest = {
    init.then(addTask(true)).then(removeTask(1)).then(addTask(true)).then(all {
      assert(nextId == 3),
      assert(issuedIds == Set(1, 2)),
      assert(backlogTaskIds == Set(2)),
      assert(not(currentTaskIds.contains(1))),
      keepStore,
    })
  }

  /// 削除後に同じIDをもう一度削除することはできない。
  run removeMissingTaskRejectedTest = {
    init.then(addTask(true)).then(removeTask(1)).then(removeTask(1)).fail()
  }

  /// listとshowは保存値を変えない。
  run readOnlyCommandsTest = {
    init.then(addTask(true)).then(listAllTasks).then(listTasks(backlog)).then(showTask(1)).then(all {
      assert(nextId == 2),
      assert(issuedIds == Set(1)),
      assert(backlogTaskIds == Set(1)),
      keepStore,
    })
  }

  /// showは存在しないIDを受け付けない。
  run showMissingTaskRejectedTest = {
    init.then(showTask(1)).fail()
  }
}
