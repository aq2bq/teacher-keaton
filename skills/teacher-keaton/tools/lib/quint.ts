// Quint/CUE の呼び出しに関する共有ヘルパ。
// project / glossary / explain などのCLIが共通で使う。
// これらはCLI向けの薄いラッパであり、失敗時はstderrへ書いて終了する。

import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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
export async function cueExport<T>(specPath: string, expression: string): Promise<T> {
  const child = Bun.spawn(["cue", "export", resolve(specPath), "-e", expression], {
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
