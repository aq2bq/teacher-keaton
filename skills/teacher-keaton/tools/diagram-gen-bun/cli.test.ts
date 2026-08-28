import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("generates the Momotaro diagram through the CLI", async () => {
  const repositoryRoot = resolve(import.meta.dir, "../../../..");
  const child = Bun.spawn([
    resolve(repositoryRoot, "skills/teacher-keaton/tools/gen-mermaid-diagram"),
    "examples/momotaro/spec",
  ], {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();

  expect(await child.exited).toBe(0);
  expect(stderr).toBe("");
  expect(stdout).toBe([
    "graph LR",
    '  n0["犬"]',
    '  n1["おばあさん"]',
    '  n2["おじいさん"]',
    '  n3["桃太郎"]',
    '  n4["猿"]',
    '  n5["鬼"]',
    '  n6["雉"]',
    '  n7["きびだんご"]',
    '  n8["桃"]',
    '  n3 -->|"育てられる"| n2',
    '  n3 -->|"育てられる"| n1',
    '  n0 -->|"仲間"| n3',
    '  n4 -->|"仲間"| n3',
    '  n6 -->|"仲間"| n3',
    '  n5 -->|"敵対"| n3',
    '  n8 -->|"生みの親"| n3',
    '  n7 -->|"対価"| n0',
    '  n7 -->|"対価"| n4',
    '  n7 -->|"対価"| n6',
    "",
  ].join("\n"));
});
