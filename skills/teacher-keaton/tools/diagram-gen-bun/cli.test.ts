import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("generates a concept map through the CLI from a self-contained fixture", async () => {
  const child = Bun.spawn([
    resolve(import.meta.dir, "../gen-mermaid-diagram"),
    resolve(import.meta.dir, "fixtures/minispec"),
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();

  expect(await child.exited).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toBe([
    "graph LR",
    '  n0["注文"]',
    '  n1["商品"]',
    '  n2["倉庫"]',
    '  n0 -->|"含む"| n1',
    '  n2 -->|"保管する"| n1',
    "",
  ].join("\n"));
});

test("中心概念のstable idと近傍深度で概念マップを絞る", async () => {
  const child = Bun.spawn([
    resolve(import.meta.dir, "../gen-mermaid-diagram"),
    resolve(import.meta.dir, "fixtures/minispec"),
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
  expect(stdout).toBe([
    "graph LR",
    '  n0["注文"]',
    '  n1["商品"]',
    '  n0 -->|"含む"| n1',
    "",
  ].join("\n"));
});

test("用語で中心概念を指定した場合は近傍深度1を既定にする", async () => {
  const child = Bun.spawn([
    resolve(import.meta.dir, "../gen-mermaid-diagram"),
    resolve(import.meta.dir, "fixtures/minispec"),
    "--focus", "注文",
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(child.stdout).text();

  expect(await child.exited).toBe(0);
  expect(stdout).toContain('["注文"]');
  expect(stdout).toContain('["商品"]');
  expect(stdout).not.toContain("倉庫");
});

test("--focus-depthだけの指定を拒否する", async () => {
  const child = Bun.spawn([
    resolve(import.meta.dir, "../gen-mermaid-diagram"),
    resolve(import.meta.dir, "fixtures/minispec"),
    "--focus-depth", "1",
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stderr = await new Response(child.stderr).text();

  expect(await child.exited).not.toBe(0);
  expect(stderr).toContain("--focus-depth には --focus が必要です");
});
