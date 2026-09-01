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
  DEFAULT_EXPLANATION_PATH,
  explanationPathForSpec,
  resolveArtifactOutputPath,
  temporaryRootForSpec,
} from "./artifacts";

describe("成果物の出力先", () => {
  const keatonSpec = resolve("keaton/spec");
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("keaton/spec を使う通常経路は実行場所の keaton に収まる", () => {
    expect(artifactRootForSpec(keatonSpec)).toBe(resolve("keaton"));
    expect(explanationPathForSpec(keatonSpec)).toBe(resolve(DEFAULT_EXPLANATION_PATH));
    expect(temporaryRootForSpec(keatonSpec)).toBe(resolve("keaton/tmp"));
  });

  test("explain の明示出力は実行場所の keaton 配下だけを許す", () => {
    expect(resolveArtifactOutputPath("keaton/views/glossary.md"))
      .toBe(resolve("keaton/views/glossary.md"));
    expect(() => resolveArtifactOutputPath("tmp/explanation.md")).toThrow();
    expect(() => resolveArtifactOutputPath("/tmp/explanation.md")).toThrow();
  });

  test("開発用の明示specパスは既存のOS一時ディレクトリ経路を保つ", () => {
    const existingSpec = resolve("fixtures/existing-model/spec");
    const otherProjectSpec = resolve("../other-project/keaton/spec");
    expect(artifactRootForSpec(existingSpec)).toBeUndefined();
    expect(artifactRootForSpec(otherProjectSpec)).toBeUndefined();
    expect(explanationPathForSpec(existingSpec)).toBeUndefined();
    expect(temporaryRootForSpec(existingSpec)).toBe(tmpdir());
  });

  test("explain は形式モデルの検証範囲を明示して keaton/explanation.md に保存する", () => {
    const workspace = mkdtempSync(join(tmpdir(), "keaton-explain-test-"));
    temporaryDirectories.push(workspace);
    mkdirSync(join(workspace, "keaton"));
    cpSync(
      resolve(import.meta.dir, "../fixtures/measure-spec"),
      join(workspace, "keaton/spec"),
      { recursive: true },
    );
    writeFileSync(
      join(workspace, "keaton/verify-result.json"),
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
    expect(result.stderr.toString()).toContain("keaton/explanation.md");
    expect(existsSync(join(workspace, "keaton/explanation.md"))).toBe(true);
    expect(statSync(join(workspace, "keaton/explanation.md")).size).toBeGreaterThan(0);
    const explanation = readFileSync(join(workspace, "keaton/explanation.md"), "utf-8");
    expect(explanation).toContain("## 形式モデルの検証");
    expect(explanation).toContain("不変条件 1/1 件で反証なし (探索深度 12)");
    expect(explanation).toContain("現場運用の実効性は検証していません");
    expect(explanation).not.toContain("## 運用未確定");
    expect(readdirSync(join(workspace, "keaton/tmp"))).toEqual([]);
  });
});
