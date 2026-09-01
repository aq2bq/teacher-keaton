import { expect, test } from "bun:test";
import { resolve } from "node:path";

const explain = resolve(import.meta.dir, "explain");
const spec = resolve(import.meta.dir, "diagram-gen-bun/fixtures/minispec");

test("explain は概念マップだけを中心概念の近傍へ絞る", async () => {
  const child = Bun.spawn([
    "bun", explain, spec,
    "--focus", "order",
    "--focus-depth", "1",
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();

  expect(await child.exited).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toContain("| 倉庫 | entity | 商品を保管する場所。 |");

  const conceptMap = stdout.split("## 概念マップ\n")[1] ?? "";
  expect(conceptMap).toContain('["注文"]');
  expect(conceptMap).toContain('["商品"]');
  expect(conceptMap).not.toContain("倉庫");
});

test("explain は未知の中心概念をエラーにする", async () => {
  const child = Bun.spawn([
    "bun", explain, spec,
    "--focus", "unknown",
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stderr = await new Response(child.stderr).text();

  expect(await child.exited).not.toBe(0);
  expect(stderr).toContain("does not match a vocabulary name or id");
});

test("explain は--focusのない--focus-depthを拒否する", async () => {
  const child = Bun.spawn([
    "bun", explain, spec,
    "--focus-depth", "1",
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stderr = await new Response(child.stderr).text();

  expect(await child.exited).not.toBe(0);
  expect(stderr).toContain("--focus-depth には --focus が必要です");
});
