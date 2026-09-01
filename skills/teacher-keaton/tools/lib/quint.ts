// Quint/CUE の呼び出しに関する共有ヘルパ。
// project / glossary / explain などのCLIが共通で使う。
// これらはCLI向けの薄いラッパであり、失敗時はstderrへ書いて終了する。

import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

// スキル利用時に作成・保持するファイルのルート。
// Ruby の spec/(RSpec)など各言語の慣習と衝突しないよう、専用の名前空間を使う。
export const DEFAULT_ARTIFACT_ROOT = "keaton";
export const DEFAULT_SPEC_PATH = `${DEFAULT_ARTIFACT_ROOT}/spec`;
export const DEFAULT_EXPLANATION_PATH = `${DEFAULT_ARTIFACT_ROOT}/explanation.md`;

// 実行場所の keaton/spec を使う通常経路なら、実行場所の成果物ルートを返す。
// 開発者が明示した既存specは、スキルの新規出力先と区別する。
export function artifactRootForSpec(specPath: string): string | undefined {
  const resolvedSpec = resolve(specPath);
  const defaultSpec = resolve(DEFAULT_SPEC_PATH);
  if (resolvedSpec === defaultSpec) {
    return resolve(DEFAULT_ARTIFACT_ROOT);
  }
  if (
    existsSync(resolvedSpec) &&
    existsSync(defaultSpec) &&
    realpathSync(resolvedSpec) === realpathSync(defaultSpec)
  ) {
    return resolve(DEFAULT_ARTIFACT_ROOT);
  }
  return undefined;
}

export function explanationPathForSpec(specPath: string): string | undefined {
  const root = artifactRootForSpec(specPath);
  return root === undefined ? undefined : join(root, "explanation.md");
}

// explainで明示する保存先も、実行場所の keaton/ から外へ出さない。
export function resolveArtifactOutputPath(outputPath: string): string {
  const root = resolve(DEFAULT_ARTIFACT_ROOT);
  const target = resolve(outputPath);
  const pathFromRoot = relative(root, target);
  if (
    pathFromRoot === "" ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`出力先は実行場所の ${DEFAULT_ARTIFACT_ROOT}/ 配下に指定してください: ${outputPath}`);
  }
  return target;
}

// 通常のスキル利用では一時ファイルも keaton/tmp に収める。
// リポジトリ開発で既存specを明示した場合だけOSの一時ディレクトリを使う。
export function temporaryRootForSpec(specPath: string): string {
  const root = artifactRootForSpec(specPath);
  return root === undefined ? tmpdir() : join(root, "tmp");
}

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
  const temporaryRoot = temporaryRootForSpec(specPath);
  await mkdir(temporaryRoot, { recursive: true });
  const directory = await mkdtemp(join(temporaryRoot, "spec-trace-"));

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
