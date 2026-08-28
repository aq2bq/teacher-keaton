import { mkdir, readFile, rename, rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import {
  createEmptyStore,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
  type TaskStore,
} from "./task";

export class PersistenceError extends Error {
  override readonly name = "PersistenceError";
}

export async function loadStore(filePath: string): Promise<TaskStore> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return createEmptyStore();
    }
    throw new PersistenceError(
      `Could not read task file "${filePath}": ${errorMessage(error)}`,
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new PersistenceError(
      `Task file "${filePath}" is not valid JSON: ${errorMessage(error)}`,
    );
  }

  try {
    return validateStore(value);
  } catch (error) {
    throw new PersistenceError(
      `Task file "${filePath}" is invalid: ${errorMessage(error)}`,
    );
  }
}

export async function saveStore(
  filePath: string,
  store: TaskStore,
): Promise<void> {
  validateStore(store);

  const parentDirectory = dirname(filePath);
  const temporaryPath = join(
    parentDirectory,
    `.${basename(filePath)}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );

  try {
    await mkdir(parentDirectory, { recursive: true });
    await Bun.write(temporaryPath, `${JSON.stringify(store, null, 2)}\n`);
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw new PersistenceError(
      `Could not write task file "${filePath}": ${errorMessage(error)}`,
    );
  }
}

function validateStore(value: unknown): TaskStore {
  if (!isRecord(value)) {
    throw new Error("root value must be an object");
  }
  if (value.version !== 1) {
    throw new Error("version must be 1");
  }
  if (!isPositiveSafeInteger(value.nextId)) {
    throw new Error("nextId must be a positive safe integer");
  }
  if (!Array.isArray(value.tasks)) {
    throw new Error("tasks must be an array");
  }

  const tasks = value.tasks.map(validateTask);
  const ids = new Set<number>();
  for (const task of tasks) {
    if (ids.has(task.id)) {
      throw new Error(`task id ${task.id} is duplicated`);
    }
    ids.add(task.id);
    if (task.id >= value.nextId) {
      throw new Error(`task id ${task.id} must be less than nextId`);
    }
  }

  return { version: 1, nextId: value.nextId, tasks };
}

function validateTask(value: unknown, index: number): Task {
  if (!isRecord(value)) {
    throw new Error(`tasks[${index}] must be an object`);
  }
  if (!isPositiveSafeInteger(value.id)) {
    throw new Error(`tasks[${index}].id must be a positive safe integer`);
  }
  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    throw new Error(`tasks[${index}].title must be a non-empty string`);
  }
  if (!isTaskStatus(value.status)) {
    throw new Error(`tasks[${index}].status is unknown`);
  }
  if (!isIsoDate(value.createdAt)) {
    throw new Error(`tasks[${index}].createdAt must be an ISO 8601 timestamp`);
  }

  if (value.status === "done") {
    if (!isIsoDate(value.completedAt)) {
      throw new Error(
        `tasks[${index}].completedAt is required when status is "done"`,
      );
    }
    if (Date.parse(value.completedAt) < Date.parse(value.createdAt)) {
      throw new Error(
        `tasks[${index}].completedAt must not precede createdAt`,
      );
    }
    return {
      id: value.id,
      title: value.title,
      status: value.status,
      createdAt: value.createdAt,
      completedAt: value.completedAt,
    };
  }

  if (value.completedAt !== undefined) {
    throw new Error(
      `tasks[${index}].completedAt is only allowed when status is "done"`,
    );
  }
  return {
    id: value.id,
    title: value.title,
    status: value.status,
    createdAt: value.createdAt,
  };
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string"
    && TASK_STATUSES.some((status) => status === value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string"
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
