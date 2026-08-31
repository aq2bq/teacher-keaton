import { describe, expect, test } from "bun:test";
import { generate, type Input } from "./index";

describe("generate", () => {
  test("writes nodes and relations as a Mermaid graph", () => {
    const input: Input = {
      vocabulary: {
        "桃太郎": { id: "char-momo", kind: "character" },
        "犬": { id: "char-dog", kind: "character" },
      },
      relations: [
        { from: "char-dog", to: "char-momo", label: "仲間" },
      ],
    };

    expect(generate(input)).toBe([
      "graph LR",
      '  n0["犬"]',
      '  n1["桃太郎"]',
      '  n0 -->|"仲間"| n1',
      "",
    ].join("\n"));
  });

  test("投影が参照する孤立概念は除外し、それ以外の孤立概念は残す", () => {
    const input: Input = {
      vocabulary: {
        "未着手": { id: "backlog", kind: "status" },
        "作業中": { id: "active", kind: "status" },
        "タスクを開始": { id: "event-start", kind: "event" },
        "注文": { id: "order", kind: "entity" },
      },
      relations: [
        { from: "backlog", to: "active", label: "開始" },
      ],
      // イベントは投影が参照する(振る舞いの図の担当)のでマップから除外。
      // 「注文」は投影も関係も無いので、関係の書き漏れシグナルとして残す。
      projectionRefs: ["event-start", "backlog", "active"],
    };

    const output = generate(input);
    expect(output).toContain('n0["作業中"]');
    expect(output).toContain('n1["未着手"]');
    expect(output).toContain('n2["注文"]');
    expect(output).not.toContain("タスクを開始");
    // 関係を持つ概念は、投影が参照していても残る
    expect(output).toContain('n1 -->|"開始"| n0');
  });
});
