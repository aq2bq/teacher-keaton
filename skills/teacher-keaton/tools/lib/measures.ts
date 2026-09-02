// 測度(数値尺度)の意味づけを扱う。
// 元データはCUEの measures(測度→{範囲, 極性, 閾値, 超過時の意味, 根拠})。
//
// 設計の要点(なぜ極性を独立の宣言にするか):
//   数値項目は「範囲」だけでは意味が決まらない。値が大きいほど良いのか悪いのかという
//   契約(極性)が別にあり、これは項目名からは決して推定できない。「品質」「満足度」の
//   ような肯定的な名前で「悪さ」「気になる程度」を測っていることがあるため、
//   極性を宣言として持ち、比較の向きはそこから導出する。
//   このライブラリは特定ドメインの語を持たない汎用の機械であり、
//   意味づけはすべてCUE側の宣言にある。

import type { ConceptProvenance, Source } from "./glossary";

// 数値の極性: 値が大きくなるほど良い状態か、悪い状態かの契約。
//   higherIsBetter 大きいほど良い(悪い側は小さい方)
//   lowerIsBetter  小さいほど良い(悪い側は大きい方)
//   neutral        良し悪しの向きを持たない(座標・設定値など)
//   unresolved     実コードからは向きが決まらない(TODO.mdで人間の判断を仰ぐ)
export type Polarity = "higherIsBetter" | "lowerIsBetter" | "neutral" | "unresolved";

export type Threshold = ConceptProvenance & {
  id: string;
  preferredName: string;
  at: number;
  // 閾値の値そのものを「悪い側」に含めるか(既定 true)。
  // 「3以上は要対応」は inclusive、「80未満は不合格」は inclusive: false。
  inclusive: boolean;
  // 閾値を超えたときの意味。状態名でも判定文でもよい。
  meaning: string;
  // 超えたときに入る状態(モデルにあれば既知id)。
  entersState?: string;
};

export type Measure = ConceptProvenance & {
  id: string;
  preferredName: string;
  definition: string;
  unit?: string;
  range: { min?: number; max?: number };
  polarity: Polarity;
  // 極性の根拠。名前から推定してはならないので、observed な位置を残す。
  polarityEvidence?: Source[];
  // 極性が unresolved のときに、なぜ決まらないかを書く(TODO.mdへ渡す)。
  unresolvedNote?: string;
  // 振る舞い(Quint)でこの測度を保持する変数名。
  quintVar?: string;
  thresholds?: Threshold[];
};

export type Measures = Record<string, Measure>;

// 悪い側がどちらかを極性から返す。決まらなければ undefined。
export function worseSide(polarity: Polarity): "high" | "low" | undefined {
  if (polarity === "lowerIsBetter") return "high";
  if (polarity === "higherIsBetter") return "low";
  return undefined;
}

// 「悪い側」を検出する比較演算子を極性と閾値から導出する。
// 向きの規則をここ1箇所に集約し、判定もQuintの述語生成も必ずここを通す
// (>= と <= を人が書き分ける箇所を作らないため)。
export type Comparison = ">=" | ">" | "<=" | "<";

export function worseSideComparison(
  polarity: Polarity,
  inclusive: boolean,
): Comparison | undefined {
  const side = worseSide(polarity);
  if (side === "high") return inclusive ? ">=" : ">";
  if (side === "low") return inclusive ? "<=" : "<";
  return undefined;
}

// 値が閾値の「悪い側」にあるかを、極性から導出して判定する。
export function isWorseSide(
  polarity: Polarity,
  threshold: Threshold,
  value: number,
): boolean {
  const comparison = worseSideComparison(polarity, threshold.inclusive);
  if (comparison === undefined) {
    throw new Error(
      `極性 ${polarity} では悪い側を決められません(閾値 ${threshold.id})`,
    );
  }
  switch (comparison) {
    case ">=":
      return value >= threshold.at;
    case ">":
      return value > threshold.at;
    case "<=":
      return value <= threshold.at;
    case "<":
      return value < threshold.at;
  }
}

// id で引ける索引にする(投影・整合検査が使う)。
export function indexMeasures(measures: Measures): Map<string, Measure> {
  const index = new Map<string, Measure>();
  for (const measure of Object.values(measures)) {
    index.set(measure.id, measure);
  }
  return index;
}

export function findThreshold(
  measure: Measure,
  thresholdId: string,
): Threshold | undefined {
  return (measure.thresholds ?? []).find((t) => t.id === thresholdId);
}

// 極性を、向きを取り違えようのない日本語にする。
// 片方向だけの表記("小さいほど良い")は読み飛ばされうるので、常に両方向を書く。
export function polarityLabel(polarity: Polarity): string {
  switch (polarity) {
    case "higherIsBetter":
      return "大きいほど良い(小さいほど悪い)";
    case "lowerIsBetter":
      return "大きいほど悪い(小さいほど良い)";
    case "neutral":
      return "良し悪しの向きを持たない";
    case "unresolved":
      return "未確認(実コードからは向きが決まらない)";
  }
}

function formatNumber(value: number): string {
  return String(value);
}

function renderRange(measure: Measure): string {
  const { min, max } = measure.range ?? {};
  const unit = measure.unit === undefined ? "" : ` ${measure.unit}`;
  if (min !== undefined && max !== undefined) {
    return `${formatNumber(min)}〜${formatNumber(max)}${unit}`;
  }
  if (min !== undefined) return `${formatNumber(min)} 以上${unit}`;
  if (max !== undefined) return `${formatNumber(max)} 以下${unit}`;
  return "—";
}

// 閾値を「どちら側が悪いか」まで含めて書き下す。
// 極性が決まらない場合は、悪い側を勝手に決めずに未確定と書く。
export function renderThreshold(measure: Measure, threshold: Threshold): string {
  const side = worseSide(measure.polarity);
  const at = formatNumber(threshold.at);
  let condition: string;
  if (side === "high") {
    condition = threshold.inclusive ? `${at} 以上が悪い側` : `${at} 超が悪い側`;
  } else if (side === "low") {
    condition = threshold.inclusive ? `${at} 以下が悪い側` : `${at} 未満が悪い側`;
  } else {
    condition = `${at}(悪い側は未確定)`;
  }
  return `${condition} → ${threshold.meaning}`;
}

function sanitizeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function renderSources(sources: Source[] | undefined): string {
  if (sources === undefined || sources.length === 0) return "";
  return sources
    .map((source) =>
      source.note === undefined ? source.location : `${source.location} (${source.note})`,
    )
    .join(" / ");
}

// 測度表(Markdown)。極性と閾値の意味を、人間が「合っている/違う」で
// 判定できる形に並べる。これがフェーズ6の判定依頼の材料になる。
export function renderMeasures(measures: Measures): string {
  const entries = Object.values(measures).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (entries.length === 0) {
    return "";
  }
  const lines = [
    "| 測度 | 範囲 | 極性 | 閾値と超過時の意味 | 極性の根拠 |",
    "|---|---|---|---|---|",
  ];
  for (const measure of entries) {
    const thresholds = (measure.thresholds ?? [])
      .map((threshold) => renderThreshold(measure, threshold))
      .join(" / ");
    const evidence = measure.polarity === "unresolved"
      ? measure.unresolvedNote ?? ""
      : renderSources(measure.polarityEvidence);
    lines.push(
      "| " +
        [
          sanitizeCell(measure.preferredName),
          sanitizeCell(renderRange(measure)),
          sanitizeCell(polarityLabel(measure.polarity)),
          sanitizeCell(thresholds === "" ? "—" : thresholds),
          sanitizeCell(evidence === "" ? "—" : evidence),
        ].join(" | ") +
        " |",
    );
  }
  return lines.join("\n") + "\n";
}
