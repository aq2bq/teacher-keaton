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
});
