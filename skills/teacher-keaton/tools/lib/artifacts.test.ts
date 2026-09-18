import { moduleNameFor } from "./quint-constants";
import { afterEach, describe, expect, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  artifactRootForSpec,
  artifactRootName,
  defaultArtifactRoot,
  explanationPathForSpec,
  resolveArtifactOutputPath,
  temporaryRootForSpec,
} from "./artifacts";

describe("成果物の出力先", () => {
  test("時刻付きルートでもQuintのモジュール名はプロジェクト名から導出する", () => {
    expect(moduleNameFor("/work/my-app/keaton_20260918123456/spec")).toBe("MyAppConstants");
  });

  test("初回出力のローカル時刻を年月日時分秒へ変換する", () => {
    expect(artifactRootName(new Date(2026, 0, 2, 3, 4, 5))).toBe("keaton_20260102030405");
  });

  test("既定はspecを持つ最新ルートを選ぶ", () => {
    const workspace = mkdtempSync(join(tmpdir(), "keaton-default-test-"));
    temporaryDirectories.push(workspace);
    mkdirSync(join(workspace, "keaton_20260102030405/spec"), { recursive: true });
    mkdirSync(join(workspace, "keaton_20260918123456/spec"), { recursive: true });
    mkdirSync(join(workspace, "keaton_20260919123456"));
    expect(defaultArtifactRoot(workspace)).toBe("keaton_20260918123456");
  });

  const keatonSpec = resolve("keaton_20260918123456/spec");
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("keaton_20260918123456/spec を使う通常経路は実行場所の keaton に収まる", () => {
    expect(artifactRootForSpec(keatonSpec)).toBe(resolve("keaton_20260918123456"));
    expect(explanationPathForSpec(keatonSpec)).toBe(resolve("keaton_20260918123456/explanation.md"));
    expect(temporaryRootForSpec(keatonSpec)).toBe(resolve("keaton_20260918123456/tmp"));
  });

  test("explain の明示出力は実行場所の keaton 配下だけを許す", () => {
    expect(resolveArtifactOutputPath("keaton_20260918123456/views/glossary.md"))
      .toBe(resolve("keaton_20260918123456/views/glossary.md"));
    expect(() => resolveArtifactOutputPath("keaton/explanation.md")).toThrow();
    expect(() => resolveArtifactOutputPath("keaton_20260918123456/../escape.md")).toThrow();
    expect(() => resolveArtifactOutputPath("keaton_20260919123456/explanation.md", keatonSpec)).toThrow();
    expect(resolveArtifactOutputPath("keaton_20260918123456/explanation.md", keatonSpec))
      .toBe(resolve("keaton_20260918123456/explanation.md"));
    expect(() => resolveArtifactOutputPath("tmp/explanation.md")).toThrow();
    expect(() => resolveArtifactOutputPath("/tmp/explanation.md")).toThrow();
  });

  test("開発用の明示specパスは既存のOS一時ディレクトリ経路を保つ", () => {
    const existingSpec = resolve("fixtures/existing-model/spec");
    const otherProjectSpec = resolve("../other-project/keaton_20260918123456/spec");
    expect(artifactRootForSpec(existingSpec)).toBeUndefined();
    expect(artifactRootForSpec(otherProjectSpec)).toBeUndefined();
    expect(explanationPathForSpec(existingSpec)).toBeUndefined();
    expect(temporaryRootForSpec(existingSpec)).toBe(tmpdir());
  });

  test("explain は形式モデルの検証範囲を明示して keaton_20260918123456/explanation.md に保存する", () => {
    const workspace = mkdtempSync(join(tmpdir(), "keaton-explain-test-"));
    temporaryDirectories.push(workspace);
    mkdirSync(join(workspace, "keaton_20260918123456"));
    cpSync(
      resolve(import.meta.dir, "../fixtures/measure-spec"),
      join(workspace, "keaton_20260918123456/spec"),
      { recursive: true },
    );
    writeFileSync(
      join(workspace, "keaton_20260918123456/verify-result.json"),
      JSON.stringify({
        verifiedAt: "2026-09-01T00:00:00.000Z",
        results: [{
          file: "model.qnt",
          invariants: ["Always"],
          outcome: "pass",
          depthReached: 12,
        }],
      }),
    );

    const result = Bun.spawnSync(
      ["bun", resolve(import.meta.dir, "../explain"), "--test", "thresholdBoundaryTest"],
      { cwd: workspace, stdout: "pipe", stderr: "pipe" },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toBe("");
    expect(result.stderr.toString()).toContain("keaton_20260918123456/explanation.md");
    expect(existsSync(join(workspace, "keaton_20260918123456/explanation.md"))).toBe(true);
    expect(statSync(join(workspace, "keaton_20260918123456/explanation.md")).size).toBeGreaterThan(0);
    const explanation = readFileSync(join(workspace, "keaton_20260918123456/explanation.md"), "utf-8");
    expect(explanation).toContain("## 形式モデルの検証");
    expect(explanation).toContain("不変条件 1/1 件で反証なし (探索深度 12)");
    expect(explanation).toContain("現場運用の実効性は検証していません");
    expect(explanation).not.toContain("## 運用未確定");
    expect(readdirSync(join(workspace, "keaton_20260918123456/tmp"))).toEqual([]);
  });
});
