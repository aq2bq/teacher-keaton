import { afterEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const tool = resolve(import.meta.dir, "verify");
const temporaryDirectories: string[] = [];

function makeWorkspace(): { root: string; spec: string; bin: string } {
  const root = mkdtempSync(join(tmpdir(), "keaton-verify-cli-"));
  temporaryDirectories.push(root);
  const spec = join(root, "spec");
  const bin = join(root, "bin");
  mkdirSync(spec);
  mkdirSync(bin);
  writeFileSync(
    join(spec, "model.qnt"),
    ["module Model {", "  val Always: bool = true", "}", ""].join("\n"),
  );
  const fakeQuint = join(bin, "quint");
  writeFileSync(
    fakeQuint,
    [
      "#!/bin/sh",
      'echo "fake quint stdout"',
      'echo "fake quint stderr" >&2',
      'exit "${FAKE_QUINT_EXIT:-0}"',
      "",
    ].join("\n"),
  );
  chmodSync(fakeQuint, 0o755);
  return { root, spec, bin };
}

async function run(
  workspace: ReturnType<typeof makeWorkspace>,
  args: string[] = [],
  extraEnv: Record<string, string> = {},
) {
  const child = Bun.spawn(
    ["bun", tool, workspace.spec, "--max-steps", "1", ...args],
    {
      cwd: workspace.root,
      env: {
        ...process.env,
        PATH: `${workspace.bin}${delimiter}${process.env.PATH ?? ""}`,
        ...extraEnv,
      },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("verify の出力", () => {
  test("既定では端末を要約に留め、詳細ログとJSONを保存する", async () => {
    const workspace = makeWorkspace();
    const result = await run(workspace);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("検証成功1件 (探索深度 1)");
    expect(result.stdout).toContain("詳細ログ:");
    expect(result.stdout).not.toContain("fake quint stdout");
    expect(result.stderr).not.toContain("fake quint stderr");

    const log = readFileSync(join(workspace.spec, "verify.log"), "utf-8");
    expect(log).toContain("model.qnt / depth 1");
    expect(log).toContain("fake quint stdout");
    expect(log).toContain("fake quint stderr");

    const json = JSON.parse(
      readFileSync(join(workspace.spec, "verify-result.json"), "utf-8"),
    ) as { results: Array<{ outcome: string; depthReached?: number }> };
    expect(json.results).toEqual([
      {
        file: "model.qnt",
        invariants: ["Always"],
        outcome: "pass",
        depthReached: 1,
      },
    ]);
  });

  test("--verbose は詳細ログと同じ子プロセス出力を端末にも表示する", async () => {
    const workspace = makeWorkspace();
    const result = await run(workspace, ["--verbose"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("fake quint stdout");
    expect(result.stderr).toContain("fake quint stderr");
    expect(readFileSync(join(workspace.spec, "verify.log"), "utf-8"))
      .toContain("fake quint stdout");
  });

  test("失敗時も要約、詳細ログ、JSONを残す", async () => {
    const workspace = makeWorkspace();
    const result = await run(workspace, [], { FAKE_QUINT_EXIT: "2" });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("深度 1 の検証に失敗しました");
    expect(result.stdout).toContain("詳細ログ:");
    expect(readFileSync(join(workspace.spec, "verify.log"), "utf-8"))
      .toContain("fake quint stderr");
    const json = JSON.parse(
      readFileSync(join(workspace.spec, "verify-result.json"), "utf-8"),
    ) as { results: Array<{ outcome: string }> };
    expect(json.results[0]?.outcome).toBe("error");
  });
});
