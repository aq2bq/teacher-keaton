// スキルの成果物は、初回出力のローカル時刻を付けたルートにまとめる。
import { existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

export function isArtifactRootName(name: string): boolean {
  return /^keaton_[0-9]{14}$/.test(name);
}

export function artifactRootName(now = new Date()): string {
  const parts = [now.getFullYear(), now.getMonth() + 1, now.getDate(),
    now.getHours(), now.getMinutes(), now.getSeconds()];
  return `keaton_${parts.map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0")).join("")}`;
}

// コマンドをまたいでも同じ成果物を参照できるよう、specを持つ最新ルートを選ぶ。
export function defaultArtifactRoot(cwd = process.cwd()): string {
  return readdirSync(cwd, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && isArtifactRootName(entry.name)
      && existsSync(join(cwd, entry.name, "spec")))
    .map(entry => entry.name).sort().at(-1) ?? artifactRootName();
}

export const DEFAULT_ARTIFACT_ROOT = defaultArtifactRoot();
export const DEFAULT_SPEC_PATH = `${DEFAULT_ARTIFACT_ROOT}/spec`;
export const DEFAULT_EXPLANATION_PATH = `${DEFAULT_ARTIFACT_ROOT}/explanation.md`;

export function artifactRootForSpec(specPath: string): string | undefined {
  const spec = resolve(specPath);
  const root = dirname(spec);
  return basename(spec) === "spec" && dirname(root) === resolve(".")
    && isArtifactRootName(basename(root)) ? root : undefined;
}

export function explanationPathForSpec(specPath: string): string | undefined {
  const root = artifactRootForSpec(specPath);
  return root === undefined ? undefined : join(root, "explanation.md");
}

export function resolveArtifactOutputPath(outputPath: string, specPath?: string): string {
  const target = resolve(outputPath);
  const parts = relative(resolve("."), target).split(sep);
  const root = specPath === undefined ? undefined : artifactRootForSpec(specPath);
  if (parts.length < 2 || !isArtifactRootName(parts[0])
    || (root !== undefined && resolve(parts[0]) !== root)) {
    throw new Error(`出力先は実行場所の成果物ルート keaton_YYYYMMDDHHmmss/ 配下（時刻付きspecの場合は同じルート）に指定してください: ${outputPath}`);
  }
  return target;
}

export function temporaryRootForSpec(specPath: string): string {
  const root = artifactRootForSpec(specPath);
  return root === undefined ? tmpdir() : join(root, "tmp");
}
