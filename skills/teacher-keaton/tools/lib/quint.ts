// Quint/CUE の呼び出しに関する共有ヘルパ。
// project / glossary / explain などのCLIが共通で使う。
// これらはCLI向けの薄いラッパであり、失敗時はstderrへ書いて終了する。

import { mkdtemp, readdir, rm } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// 既定の spec 出力先。Ruby の spec/(RSpec)など各言語の慣習と衝突しないよう、
// 専用の keaton/ 名前空間を使う。ユーザーが明示的に指定すればそちらを優先する。
export const DEFAULT_SPEC_PATH = "keaton/spec";

// <specパス> 引数を解決する。未指定なら DEFAULT_SPEC_PATH を使う。
// 存在しなければ明確なエラーで終了する。
// CUE はシンボリックリンク未解決のパスを拒むため、realpath で正規化する。
export function resolveSpecPath(arg: string | undefined): string {
  const raw = arg ?? DEFAULT_SPEC_PATH;
  const resolved = resolve(raw);
  if (!existsSync(resolved)) {
    console.error(`error: specディレクトリが見つかりません: ${raw}`);
    if (arg === undefined) {
      console.error(
        `(既定は ${DEFAULT_SPEC_PATH}。パスを明示的に渡すか、先にディレクトリを作成してください)`,
      );
    }
    process.exit(1);
  }
  return realpathSync(resolved);
}

// モデルの .qnt を特定する。ディレクトリ名と同名とは限らないため、
// constants.qnt(生成物)を除いた単一の .qnt を探す。
export async function findQuintInput(specPath: string): Promise<string> {
  const resolved = resolve(specPath);
  const files = (await readdir(resolved)).filter(
    (file) => file.endsWith(".qnt") && file !== "constants.qnt",
  );
  if (files.length === 1) {
    return join(resolved, files[0]);
  }
  console.error(
    `error: モデルの.qntを特定できませんでした(候補 ${files.length} 件: ${files.join(", ")})`,
  );
  process.exit(1);
}

// cue export -e <expression> の結果をJSONとして読む。
// CUEはcwdからの相対パスの取り方次第で「non-canonical import path」を
// 起こすため、specディレクトリをcwdにして "." を渡す(cwd非依存にする)。
export async function cueExport<T>(specPath: string, expression: string): Promise<T> {
  const child = Bun.spawn(["cue", "export", ".", "-e", expression], {
    cwd: resolve(specPath),
    stdout: "pipe",
    stderr: "inherit",
  });
  const output = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    console.error(`error: cue export -e ${expression} に失敗しました`);
    process.exit(exitCode);
  }
  return JSON.parse(output) as T;
}

// 任意のフィールド向けの cue export。失敗しても終了せず undefined を返す
// (about のように「あれば読む」フィールド用)。
export async function tryCueExport<T>(specPath: string, expression: string): Promise<T | undefined> {
  const child = Bun.spawn(["cue", "export", ".", "-e", expression], {
    cwd: resolve(specPath),
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    return undefined;
  }
  try {
    return JSON.parse(output) as T;
  } catch {
    return undefined;
  }
}

async function runQuint(args: string[]): Promise<number> {
  const child = Bun.spawn(["quint", ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) process.stderr.write(stdout);
  if (stderr.length > 0) process.stderr.write(stderr);
  return exitCode;
}

// トレースの取得元。run=ランダム(観測)、test=固定シナリオ(宣言)。
export type TraceSource =
  | { mode: "run"; seed?: string; maxSteps: number }
  | { mode: "test"; testName: string };

// ITFトレースを一時ディレクトリに生成し、そのパスを返す。
// 呼び出し元は使い終わったら cleanupTrace で削除する。
export async function generateTrace(
  specPath: string,
  source: TraceSource,
): Promise<{ directory: string; path: string }> {
  const quintInput = await findQuintInput(specPath);
  const directory = await mkdtemp(join(tmpdir(), "spec-trace-"));

  if (source.mode === "run") {
    const path = join(directory, "trace.itf.json");
    const args = [
      "run", quintInput,
      "--max-steps", String(source.maxSteps),
      "--n-traces", "1",
      "--out-itf", path,
    ];
    if (source.seed !== undefined) args.push("--seed", source.seed);
    const exitCode = await runQuint(args);
    if (exitCode !== 0) process.exit(exitCode);
    return { directory, path };
  }

  const outputPattern = join(directory, "out_{test}_{seq}.itf.json");
  const exitCode = await runQuint([
    "test", quintInput,
    "--match", source.testName,
    "--out-itf", outputPattern,
  ]);
  if (exitCode !== 0) process.exit(exitCode);

  const itfFiles = (await readdir(directory))
    .filter((file) => file.endsWith(".itf.json"))
    .sort();
  const selected = itfFiles[0];
  if (selected === undefined) {
    console.error(`error: テスト ${JSON.stringify(source.testName)} のITFが生成されませんでした`);
    process.exit(1);
  }
  return { directory, path: join(directory, selected) };
}

export async function cleanupTrace(directory: string): Promise<void> {
  await rm(directory, { recursive: true });
}
