import { describe, expect, test } from "bun:test";
import { generateConstants } from "./quint-constants";
import type { Measures } from "./measures";

const ids = ["calm", "measure-annoyance", "threshold-annoyance-high"];

const measures: Measures = {
  annoyance: {
    id: "measure-annoyance",
    preferredName: "気になる度",
    definition: "利用者が気にしている度合い。",
    range: { min: 0, max: 10 },
    polarity: "lowerIsBetter",
    quintVar: "annoyance",
    thresholds: [
      {
        id: "threshold-annoyance-high",
        preferredName: "要対応の閾値",
        at: 3,
        inclusive: true,
        meaning: "要対応として扱う",
      },
    ],
  },
};

describe("generateConstants", () => {
  test("測度が無ければ、これまでどおりidの定数だけを出す", () => {
    const output = generateConstants(ids, "XConstants");
    expect(output).toContain('pure val calm: str = "calm"');
    expect(output).not.toContain("IsWorseSide");
    // 測度を渡さない呼び出しと、空の測度を渡す呼び出しは同じ結果になる。
    expect(generateConstants(ids, "XConstants", {})).toBe(output);
  });

  test("閾値の定数と、向きを名前に持つ述語を生成する", () => {
    const output = generateConstants(ids, "XConstants", measures);
    expect(output).toContain("pure val thresholdAnnoyanceHighAt: int = 3");
    // 比較の向きは極性から導出される(小さいほど良い → 大きい側が悪い)。
    expect(output).toContain(
      "pure def thresholdAnnoyanceHighIsWorseSide(value: int): bool = value >= thresholdAnnoyanceHighAt",
    );
    expect(output).toContain("pure def thresholdAnnoyanceHighIsBetterSide(value: int): bool");
    expect(output).toContain("大きいほど悪い(小さいほど良い)");
  });

  test("極性が逆なら、生成される比較の向きも逆になる", () => {
    const flipped: Measures = {
      annoyance: { ...measures.annoyance, polarity: "higherIsBetter" },
    };
    const output = generateConstants(ids, "XConstants", flipped);
    expect(output).toContain(
      "pure def thresholdAnnoyanceHighIsWorseSide(value: int): bool = value <= thresholdAnnoyanceHighAt",
    );
  });

  test("向きが決まらない極性では述語を生成せず、理由を残す", () => {
    const unresolved: Measures = {
      annoyance: { ...measures.annoyance, polarity: "unresolved" },
    };
    const output = generateConstants(ids, "XConstants", unresolved);
    expect(output).not.toContain("IsWorseSide");
    expect(output).toContain("極性が unresolved のため");
  });

  test("整数でない閾値は述語にせず、抽象化を促す", () => {
    const fractional: Measures = {
      annoyance: {
        ...measures.annoyance,
        thresholds: [{ ...measures.annoyance.thresholds![0], at: 3.5 }],
      },
    };
    const output = generateConstants(ids, "XConstants", fractional);
    expect(output).not.toContain("IsWorseSide");
    expect(output).toContain("整数でないため述語を生成しません");
  });
});
