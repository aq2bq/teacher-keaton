import { resolve } from "node:path";
import { loadStore, PersistenceError, saveStore } from "./persistence";
import {
  addTask,
  completeTask,
  findTask,
  removeTask,
  reopenTask,
  startTask,
  TASK_STATUSES,
  TaskError,
  type Task,
  type TaskStatus,
} from "./task";

const USAGE = `Usage: todo [--file <path>] <command>

Commands:
  add <title>              Add a task in backlog
  list [--status <status>] List tasks, optionally filtered by status
  show <id>                Show one task
  start <id>               Move a backlog task to active
  done <id>                Move an active task to done
  reopen <id>              Move a done task back to active
  rm <id>                  Remove a task

Statuses: ${TASK_STATUSES.join(", ")}`;

class UsageError extends Error {
  override readonly name = "UsageError";
}

export async function runCli(args: string[]): Promise<number> {
  try {
    const parsed = parseGlobalOptions(args);
    if (parsed.args.length === 0 || parsed.args[0] === "help") {
      console.log(USAGE);
      return 0;
    }

    const [command, ...commandArgs] = parsed.args;
    const store = await loadStore(parsed.filePath);

    switch (command) {
      case "add": {
        const title = commandArgs.join(" ");
        if (title.trim().length === 0) {
          throw new UsageError("add requires a title.");
        }
        const result = addTask(store, title);
        await saveStore(parsed.filePath, result.store);
        console.log(`Added task ${result.task.id} (backlog): ${result.task.title}`);
        return 0;
      }
      case "list": {
        const status = parseListOptions(commandArgs);
        const tasks = status === undefined
          ? store.tasks
          : store.tasks.filter((task) => task.status === status);
        printTaskList(tasks);
        return 0;
      }
      case "show": {
        const task = findTask(store, parseSingleId(command, commandArgs));
        printTask(task);
        return 0;
      }
      case "start": {
        const result = startTask(
          store,
          parseSingleId(command, commandArgs),
        );
        await saveStore(parsed.filePath, result.store);
        console.log(`Started task ${result.task.id}.`);
        return 0;
      }
      case "done": {
        const result = completeTask(
          store,
          parseSingleId(command, commandArgs),
        );
        await saveStore(parsed.filePath, result.store);
        console.log(`Completed task ${result.task.id}.`);
        return 0;
      }
      case "reopen": {
        const result = reopenTask(
          store,
          parseSingleId(command, commandArgs),
        );
        await saveStore(parsed.filePath, result.store);
        console.log(`Reopened task ${result.task.id}.`);
        return 0;
      }
      case "rm": {
        const result = removeTask(
          store,
          parseSingleId(command, commandArgs),
        );
        await saveStore(parsed.filePath, result.store);
        console.log(`Removed task ${result.task.id}.`);
        return 0;
      }
      default:
        throw new UsageError(`Unknown command "${command}".`);
    }
  } catch (error) {
    if (
      error instanceof UsageError
      || error instanceof TaskError
      || error instanceof PersistenceError
    ) {
      console.error(`Error: ${error.message}`);
      if (error instanceof UsageError) {
        console.error("Run `todo help` for usage.");
      }
      return error instanceof UsageError ? 2 : 1;
    }
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

function parseGlobalOptions(args: string[]): {
  filePath: string;
  args: string[];
} {
  const remaining: string[] = [];
  let filePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== "--file") {
      remaining.push(argument);
      continue;
    }

    const value = args[index + 1];
    if (filePath !== undefined || value === undefined || value.startsWith("--")) {
      throw new UsageError("--file requires one path and may only be used once.");
    }
    filePath = value;
    index += 1;
  }

  return {
    filePath: resolve(filePath ?? ".todo.json"),
    args: remaining,
  };
}

function parseListOptions(args: string[]): TaskStatus | undefined {
  if (args.length === 0) {
    return undefined;
  }
  if (args.length !== 2 || args[0] !== "--status") {
    throw new UsageError("list accepts only --status <status>.");
  }
  const status = args[1];
  if (!TASK_STATUSES.some((candidate) => candidate === status)) {
    throw new UsageError(
      `Unknown status "${status}"; expected one of: ${TASK_STATUSES.join(", ")}.`,
    );
  }
  return status as TaskStatus;
}

function parseSingleId(command: string, args: string[]): number {
  if (args.length !== 1 || !/^[1-9]\d*$/.test(args[0])) {
    throw new UsageError(`${command} requires one positive integer id.`);
  }
  const id = Number(args[0]);
  if (!Number.isSafeInteger(id)) {
    throw new UsageError(`${command} id must be a safe integer.`);
  }
  return id;
}

function printTaskList(tasks: Task[]): void {
  if (tasks.length === 0) {
    console.log("No tasks.");
    return;
  }
  console.log("ID\tSTATUS\tCREATED\tCOMPLETED\tTITLE");
  for (const task of tasks) {
    console.log([
      task.id,
      task.status,
      task.createdAt,
      task.completedAt ?? "-",
      task.title,
    ].join("\t"));
  }
}

function printTask(task: Task): void {
  console.log(`ID: ${task.id}`);
  console.log(`Title: ${task.title}`);
  console.log(`Status: ${task.status}`);
  console.log(`Created: ${task.createdAt}`);
  console.log(`Completed: ${task.completedAt ?? "-"}`);
}
