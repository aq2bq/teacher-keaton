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

  test("中心概念から入向き・出向きの両方をたどり、近傍深度で絞る", () => {
    const input: Input = {
      vocabulary: {
        "中心": { id: "center", kind: "entity" },
        "入向き": { id: "incoming", kind: "entity" },
        "出向き": { id: "outgoing", kind: "entity" },
        "二辺先": { id: "distance-two", kind: "entity" },
        "無関係": { id: "unrelated", kind: "entity" },
      },
      relations: [
        { from: "incoming", to: "center", label: "入る" },
        { from: "center", to: "outgoing", label: "出る" },
        { from: "outgoing", to: "distance-two", label: "次" },
      ],
      focus: { concept: "中心", depth: 1 },
    };

    const output = generate(input);
    expect(output).toContain('["中心"]');
    expect(output).toContain('["入向き"]');
    expect(output).toContain('["出向き"]');
    expect(output).not.toContain("二辺先");
    expect(output).not.toContain("無関係");

    const depthTwo = generate({
      ...input,
      focus: { concept: "center", depth: 2 },
    });
    expect(depthTwo).toContain('["二辺先"]');
    expect(depthTwo).not.toContain("無関係");
  });

  test("用語とstable idのどちらでも同じ中心概念を指定できる", () => {
    const base: Input = {
      vocabulary: {
        "注文": { id: "order", kind: "entity" },
        "商品": { id: "product", kind: "entity" },
      },
      relations: [{ from: "order", to: "product", label: "含む" }],
    };

    expect(generate({ ...base, focus: { concept: "注文", depth: 0 } }))
      .toBe(generate({ ...base, focus: { concept: "order", depth: 0 } }));
  });

  test("未知の中心概念と不正な近傍深度を拒否する", () => {
    const input: Input = {
      vocabulary: { "注文": { id: "order", kind: "entity" } },
      relations: [],
    };

    expect(() => generate({ ...input, focus: { concept: "unknown", depth: 1 } }))
      .toThrow("does not match a vocabulary name or id");
    expect(() => generate({ ...input, focus: { concept: "order", depth: -1 } }))
      .toThrow("focus depth must be a non-negative integer");
  });

  test("用語と別概念のstable idが衝突する曖昧な指定を拒否する", () => {
    const input: Input = {
      vocabulary: {
        "注文": { id: "order", kind: "entity" },
        "別概念": { id: "注文", kind: "entity" },
      },
      relations: [],
      focus: { concept: "注文", depth: 0 },
    };

    expect(() => generate(input)).toThrow("is ambiguous");
  });
});
