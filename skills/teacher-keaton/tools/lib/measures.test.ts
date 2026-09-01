import { describe, expect, test } from "bun:test";
import {
  indexMeasures,
  isWorseSide,
  polarityLabel,
  renderMeasures,
  renderThreshold,
  worseSide,
  worseSideComparison,
  type Measure,
  type Measures,
  type Threshold,
} from "./measures";

const threshold: Threshold = {
  id: "threshold-annoyance-high",
  preferredName: "要対応の閾値",
  at: 3,
  inclusive: true,
  meaning: "要対応として扱う",
};

// 名前は肯定的だが、測っているのは困りごとの強さ(小さいほど良い)。
const annoyance: Measure = {
  id: "measure-annoyance",
  preferredName: "気になる度",
  definition: "利用者が気にしている度合い。",
  range: { min: 0, max: 10 },
  polarity: "lowerIsBetter",
  polarityEvidence: [{ location: "src/alert.ts:12", note: "大きいときに警告" }],
  quintVar: "annoyance",
  thresholds: [threshold],
};

describe("極性から比較の向きを導出する", () => {
  test("小さいほど良い尺度では、大きい側が悪い", () => {
    expect(worseSide("lowerIsBetter")).toBe("high");
    expect(worseSideComparison("lowerIsBetter", true)).toBe(">=");
    expect(worseSideComparison("lowerIsBetter", false)).toBe(">");
    expect(isWorseSide("lowerIsBetter", threshold, 3)).toBe(true);
    expect(isWorseSide("lowerIsBetter", threshold, 2)).toBe(false);
  });

  test("大きいほど良い尺度では、小さい側が悪い", () => {
    expect(worseSide("higherIsBetter")).toBe("low");
    expect(worseSideComparison("higherIsBetter", true)).toBe("<=");
    expect(worseSideComparison("higherIsBetter", false)).toBe("<");
    expect(isWorseSide("higherIsBetter", threshold, 3)).toBe(true);
    expect(isWorseSide("higherIsBetter", threshold, 4)).toBe(false);
  });

  test("inclusive は閾値そのものがどちら側かを決める", () => {
    const exclusive: Threshold = { ...threshold, inclusive: false };
    expect(isWorseSide("lowerIsBetter", exclusive, 3)).toBe(false);
    expect(isWorseSide("lowerIsBetter", exclusive, 4)).toBe(true);
  });

  test("向きが決まらない極性では判定できず、勝手に決めない", () => {
    expect(worseSide("neutral")).toBeUndefined();
    expect(worseSide("unresolved")).toBeUndefined();
    expect(worseSideComparison("neutral", true)).toBeUndefined();
    expect(() => isWorseSide("unresolved", threshold, 3)).toThrow();
  });
});

describe("表示", () => {
  test("極性は常に両方向を書く(片方向だと読み飛ばされる)", () => {
    expect(polarityLabel("lowerIsBetter")).toBe("大きいほど悪い(小さいほど良い)");
    expect(polarityLabel("higherIsBetter")).toBe("大きいほど良い(小さいほど悪い)");
  });

  test("閾値は、どちら側が悪いかまで書き下す", () => {
    expect(renderThreshold(annoyance, threshold)).toBe("3 以上が悪い側 → 要対応として扱う");
    expect(renderThreshold({ ...annoyance, polarity: "higherIsBetter" }, threshold))
      .toBe("3 以下が悪い側 → 要対応として扱う");
    expect(renderThreshold({ ...annoyance, polarity: "unresolved" }, threshold))
      .toBe("3(悪い側は未確定) → 要対応として扱う");
  });

  test("測度表は範囲・極性・閾値・極性の根拠を出す", () => {
    const measures: Measures = { annoyance };
    const output = renderMeasures(measures);
    expect(output).toContain("| 気になる度 | 0〜10 | 大きいほど悪い(小さいほど良い)");
    expect(output).toContain("3 以上が悪い側 → 要対応として扱う");
    expect(output).toContain("src/alert.ts:12 (大きいときに警告)");
  });

  test("極性が未確認なら、根拠の代わりに理由を出す", () => {
    const output = renderMeasures({
      x: {
        ...annoyance,
        polarity: "unresolved",
        polarityEvidence: undefined,
        unresolvedNote: "警告文もソート順も見つからない",
      },
    });
    expect(output).toContain("未確認(実コードからは向きが決まらない)");
    expect(output).toContain("警告文もソート順も見つからない");
  });

  test("測度が無ければ空文字を返す(表を出さない)", () => {
    expect(renderMeasures({})).toBe("");
  });
});

test("indexMeasures は id で引ける索引を作る", () => {
  const index = indexMeasures({ annoyance });
  expect(index.get("measure-annoyance")?.preferredName).toBe("気になる度");
});
