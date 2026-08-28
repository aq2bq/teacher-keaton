export const TASK_STATUSES = ["backlog", "active", "done"] as const;

export type TaskStatus = typeof TASK_STATUSES[number];

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
};

export type TaskStore = {
  version: 1;
  nextId: number;
  tasks: Task[];
};

export class TaskError extends Error {
  override readonly name = "TaskError";
}

export function createEmptyStore(): TaskStore {
  return { version: 1, nextId: 1, tasks: [] };
}

export function addTask(
  store: TaskStore,
  title: string,
  now = new Date(),
): { store: TaskStore; task: Task } {
  const normalizedTitle = title.trim();
  if (normalizedTitle.length === 0) {
    throw new TaskError("Task title must not be empty.");
  }

  const task: Task = {
    id: store.nextId,
    title: normalizedTitle,
    status: "backlog",
    createdAt: now.toISOString(),
  };

  return {
    store: {
      ...store,
      nextId: store.nextId + 1,
      tasks: [...store.tasks, task],
    },
    task,
  };
}

export function startTask(
  store: TaskStore,
  id: number,
): { store: TaskStore; task: Task } {
  return transitionTask(store, id, "backlog", "active", "started");
}

export function completeTask(
  store: TaskStore,
  id: number,
  now = new Date(),
): { store: TaskStore; task: Task } {
  return transitionTask(store, id, "active", "done", "completed", {
    completedAt: now.toISOString(),
  });
}

export function reopenTask(
  store: TaskStore,
  id: number,
): { store: TaskStore; task: Task } {
  const current = findTask(store, id);
  if (current.status !== "done") {
    throw invalidTransition(current, "reopened", "done");
  }

  const { completedAt: _completedAt, ...taskWithoutCompletedAt } = current;
  const task: Task = { ...taskWithoutCompletedAt, status: "active" };
  return { store: replaceTask(store, task), task };
}

export function removeTask(
  store: TaskStore,
  id: number,
): { store: TaskStore; task: Task } {
  const task = findTask(store, id);
  return {
    store: {
      ...store,
      tasks: store.tasks.filter((candidate) => candidate.id !== id),
    },
    task,
  };
}

export function findTask(store: TaskStore, id: number): Task {
  const task = store.tasks.find((candidate) => candidate.id === id);
  if (task === undefined) {
    throw new TaskError(`Task ${id} does not exist.`);
  }
  return task;
}

function transitionTask(
  store: TaskStore,
  id: number,
  expectedStatus: TaskStatus,
  nextStatus: TaskStatus,
  operation: string,
  fields: Pick<Task, "completedAt"> = {},
): { store: TaskStore; task: Task } {
  const current = findTask(store, id);
  if (current.status !== expectedStatus) {
    throw invalidTransition(current, operation, expectedStatus);
  }

  const task: Task = { ...current, ...fields, status: nextStatus };
  return { store: replaceTask(store, task), task };
}

function replaceTask(store: TaskStore, task: Task): TaskStore {
  return {
    ...store,
    tasks: store.tasks.map((candidate) =>
      candidate.id === task.id ? task : candidate
    ),
  };
}

function invalidTransition(
  task: Task,
  operation: string,
  expectedStatus: TaskStatus,
): TaskError {
  return new TaskError(
    `Task ${task.id} cannot be ${operation} from status "${task.status}"; expected "${expectedStatus}".`,
  );
}
