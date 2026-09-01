// スキルが作成または保持する成果物の配置規則。
// CLIや形式検証処理は、保存先を独自に組み立てずこのモジュールから受け取る。

import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

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
