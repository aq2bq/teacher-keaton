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
