// 汎用投影エンジン: 宣言的な投影仕様とQuintのトレースから、
// 形式に依存しないイベント列を生成する。
//
// 設計原則(リポジトリの汎化の結論):
//   - 参加者・ラベルの「語彙」はCUEが原本(このライブラリは語彙を保持しない)
//   - 「状態差分をどう意味づけるか」だけが投影仕様に宣言される
//   - 本ライブラリは仕様とトレースを読み、イベント列を導出するだけの
//     汎用の機械であり、特定アプリの固有名詞を一切含まない

// ---------- 投影仕様の型 ----------

import {
  findThreshold,
  indexMeasures,
  isWorseSide,
  worseSide,
  type Measure,
  type Measures,
} from "./measures";

// 状態差分を検出する最小の述語。必要になったら拡張する。
export type DiffPredicate =
  | { kind: "setGains"; var: string; bind?: string }
  | { kind: "setLoses"; var: string; bind?: string }
  | { kind: "move"; from: string; to: string; bind?: string }
  | { kind: "intDecreases"; var: string }
  | { kind: "intIncreases"; var: string }
  | { kind: "boolBecomes"; var: string; value: boolean }
  // リスト(観測専用ログ等)への要素の追加を検出する。
  // 拒否・重複拒否のようにドメイン状態を変えない事象は、観測専用の
  // リスト変数への記録としてモデル化し、この述語で投影する。
  // value を指定すると、追加された要素がその値を含む場合だけ成立する。
  | { kind: "sequenceAppends"; var: string; value?: string; bind?: string }
  // 測度(数値尺度)の意味づけ。増減ではなく「悪化/改善」で書く。
  // 増加が悪化なのか改善なのかはCUEの極性から解決するため、投影仕様には
  // 向きを書かない(極性を直せば図が自動で追随する)。
  | { kind: "measureWorsens"; var: string; measure: string }
  | { kind: "measureImproves"; var: string; measure: string }
  // 閾値の跨ぎ。良い側から悪い側へ入った/戻ったときに成立する。
  | { kind: "measureEntersWorseSide"; var: string; measure: string; threshold: string }
  | { kind: "measureEntersBetterSide"; var: string; measure: string; threshold: string };

// from/to は「stable id のリテラル」または「"$<bind>" のバインディング参照」。
// ラベルは持たない: 表示名はイベントのstable idから語彙(vocabulary)が解決する。
// 図に出る語を語彙の管理外で再入力させないための設計(立場: 語彙)。
export type Endpoint = { from: string; to: string };

export type ProjectionRule = {
  event: string;
  when: DiffPredicate[];
  // sequenceDiagram 向け(参加者間のメッセージ)か状態遷移図向けかを
  // レンダラが使い分ける。両方は持たない。
  message?: Endpoint;
  transition?: Endpoint;
};

export type ProjectionSpec = {
  format?: string;
  events: ProjectionRule[];
};

// ---------- トレースの型 ----------

// ITFの1状態。値は {"#set":[...]}, {"#bigint":"..."} 等の包みを持つ。
export type TraceState = Record<string, unknown>;
export type Trace = { states: TraceState[] };

// 1遷移で発火したイベント。
export type FiredEvent = {
  event: string;
  bindings: Record<string, string[]>;
  message?: Endpoint;
  transition?: Endpoint;
};

// ---------- ITFの包みを外す ----------

function unwrap(value: unknown): unknown {
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("#set" in record) return record["#set"];
    if ("#bigint" in record) return BigInt(record["#bigint"] as string);
  }
  return value;
}

function asSet(state: TraceState, name: string): Set<string> {
  const value = unwrap(state[name]);
  if (!Array.isArray(value)) return new Set();
  return new Set(value.map((item) => String(item)));
}

function asInt(state: TraceState, name: string): bigint | null {
  const value = unwrap(state[name]);
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return null;
}

function asList(state: TraceState, name: string): string[] {
  const value = unwrap(state[name]);
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(unwrap(item)));
}

// ---------- 述語の評価 ----------

type PredicateResult = { holds: boolean; bindings: Record<string, string[]> };

// 投影の評価に必要な、仕様の外側の文脈。
// 現状は測度の極性・閾値だけ(CUEの measures から作る)。
// エンジンはドメインの語を持たず、意味づけの原本はCUE側にあるという
// 設計を保つため、値はすべて呼び出し側から渡す。
export type ProjectionContext = { measures?: Map<string, Measure> };

function lookupMeasure(
  context: ProjectionContext,
  measureId: string,
): Measure {
  const measure = context.measures?.get(measureId);
  if (measure === undefined) {
    throw new Error(
      `projection: 測度 "${measureId}" がCUEの measures にありません`,
    );
  }
  return measure;
}

// 悪化の向き(増加か減少か)を極性から解決する。
function worsensBy(measure: Measure): "increase" | "decrease" {
  const side = worseSide(measure.polarity);
  if (side === undefined) {
    throw new Error(
      `projection: 測度 "${measure.id}" の極性は ${measure.polarity} なので、` +
        "悪化と改善を決められません(極性を確定させてください)",
    );
  }
  return side === "high" ? "increase" : "decrease";
}

function evaluatePredicate(
  predicate: DiffPredicate,
  prev: TraceState,
  curr: TraceState,
  context: ProjectionContext,
): PredicateResult {
  switch (predicate.kind) {
    case "setGains": {
      const before = asSet(prev, predicate.var);
      const after = asSet(curr, predicate.var);
      const gained = [...after].filter((item) => !before.has(item));
      return {
        holds: gained.length > 0,
        bindings: predicate.bind ? { [predicate.bind]: gained } : {},
      };
    }
    case "setLoses": {
      const before = asSet(prev, predicate.var);
      const after = asSet(curr, predicate.var);
      const lost = [...before].filter((item) => !after.has(item));
      return {
        holds: lost.length > 0,
        bindings: predicate.bind ? { [predicate.bind]: lost } : {},
      };
    }
    case "move": {
      const fromBefore = asSet(prev, predicate.from);
      const fromAfter = asSet(curr, predicate.from);
      const toBefore = asSet(prev, predicate.to);
      const toAfter = asSet(curr, predicate.to);
      const left = [...fromBefore].filter((item) => !fromAfter.has(item));
      const entered = new Set([...toAfter].filter((item) => !toBefore.has(item)));
      const moved = left.filter((item) => entered.has(item));
      return {
        holds: moved.length > 0,
        bindings: predicate.bind ? { [predicate.bind]: moved } : {},
      };
    }
    case "intDecreases": {
      const before = asInt(prev, predicate.var);
      const after = asInt(curr, predicate.var);
      return { holds: before !== null && after !== null && after < before, bindings: {} };
    }
    case "intIncreases": {
      const before = asInt(prev, predicate.var);
      const after = asInt(curr, predicate.var);
      return { holds: before !== null && after !== null && after > before, bindings: {} };
    }
    case "boolBecomes": {
      const before = unwrap(prev[predicate.var]);
      const after = unwrap(curr[predicate.var]);
      return { holds: before !== predicate.value && after === predicate.value, bindings: {} };
    }
    case "sequenceAppends": {
      const before = asList(prev, predicate.var);
      const after = asList(curr, predicate.var);
      const isPrefix = after.length >= before.length &&
        before.every((item, index) => after[index] === item);
      const appended = isPrefix ? after.slice(before.length) : [];
      const matched = predicate.value === undefined
        ? appended
        : appended.filter((item) => item === predicate.value);
      return {
        holds: matched.length > 0,
        bindings: predicate.bind ? { [predicate.bind]: matched } : {},
      };
    }
    case "measureWorsens":
    case "measureImproves": {
      const measure = lookupMeasure(context, predicate.measure);
      const before = asInt(prev, predicate.var);
      const after = asInt(curr, predicate.var);
      if (before === null || after === null) {
        return { holds: false, bindings: {} };
      }
      const direction = worsensBy(measure);
      const increased = after > before;
      const decreased = after < before;
      const worsened = direction === "increase" ? increased : decreased;
      const improved = direction === "increase" ? decreased : increased;
      return {
        holds: predicate.kind === "measureWorsens" ? worsened : improved,
        bindings: {},
      };
    }
    case "measureEntersWorseSide":
    case "measureEntersBetterSide": {
      const measure = lookupMeasure(context, predicate.measure);
      const threshold = findThreshold(measure, predicate.threshold);
      if (threshold === undefined) {
        throw new Error(
          `projection: 測度 "${measure.id}" に閾値 "${predicate.threshold}" がありません`,
        );
      }
      const before = asInt(prev, predicate.var);
      const after = asInt(curr, predicate.var);
      if (before === null || after === null) {
        return { holds: false, bindings: {} };
      }
      const wasWorse = isWorseSide(measure.polarity, threshold, Number(before));
      const isWorse = isWorseSide(measure.polarity, threshold, Number(after));
      const entersWorse = !wasWorse && isWorse;
      const entersBetter = wasWorse && !isWorse;
      return {
        holds: predicate.kind === "measureEntersWorseSide" ? entersWorse : entersBetter,
        bindings: {},
      };
    }
  }
}

// ---------- イベント検出 ----------

// 隣接状態の各ペアについて、仕様を満たすイベントを検出する。
// 戻り値は「遷移ごとの発火イベント列」で、順序は仕様内の規則順。
export function detectEvents(
  trace: Trace,
  spec: ProjectionSpec,
  context: ProjectionContext = {},
): FiredEvent[][] {
  const steps: FiredEvent[][] = [];
  const states = trace.states;

  for (let index = 1; index < states.length; index += 1) {
    const prev = states[index - 1];
    const curr = states[index];
    const fired: FiredEvent[] = [];

    for (const rule of spec.events) {
      let allHold = true;
      const bindings: Record<string, string[]> = {};

      for (const predicate of rule.when) {
        const result = evaluatePredicate(predicate, prev, curr, context);
        if (!result.holds) {
          allHold = false;
          break;
        }
        Object.assign(bindings, result.bindings);
      }

      if (allHold) {
        fired.push({
          event: rule.event,
          bindings,
          message: rule.message,
          transition: rule.transition,
        });
      }
    }

    if (fired.length > 0) {
      steps.push(fired);
    }
  }

  return steps;
}

// CUEの measures(任意)から、投影エンジンが使う文脈を作る。
export function makeProjectionContext(measures: Measures | undefined): ProjectionContext {
  if (measures === undefined) {
    return {};
  }
  return { measures: indexMeasures(measures) };
}

// 投影仕様の when が参照するQuint変数名を集める。
// 変数名を間違えると述語が永远に成立せず「何も出ない図」になるため、
// 宣言済みの変数と突合して事前に検出する(検査は check-consistency が行う)。
export function referencedVars(spec: ProjectionSpec): string[] {
  const refs: string[] = [];
  for (const rule of spec.events) {
    for (const predicate of rule.when) {
      if (predicate.kind === "move") {
        refs.push(predicate.from, predicate.to);
      } else {
        // 測度の述語も var を持つ(測度を保持するQuint変数)。
        refs.push(predicate.var);
      }
    }
  }
  return refs;
}

// 投影仕様が参照する変数が宣言済みか検査し、未知の変数のエラー列を返す。
export function validateProjectionVars(
  spec: ProjectionSpec,
  declaredVars: Iterable<string>,
): string[] {
  const declared = new Set(declaredVars);
  const errors: string[] = [];
  for (const rule of spec.events) {
    for (const ref of referencedVars({ events: [rule] })) {
      if (!declared.has(ref)) {
        errors.push(
          `projection.cue: event "${rule.event}" の when が未知のQuint変数 "${ref}" を参照`,
        );
      }
    }
  }
  return errors;
}

// 投影仕様が参照する語彙のidを集める(event名と、バインディング・開始記号
// 以外の from/to)。概念マップが「振る舞いの図が意味を担う概念」を除外する
// 判断に使う。
export function projectionVocabRefs(spec: ProjectionSpec): string[] {
  const refs = new Set<string>();
  for (const rule of spec.events ?? []) {
    refs.add(rule.event);
    for (const endpoint of [rule.message, rule.transition]) {
      if (endpoint === undefined) continue;
      for (const ref of [endpoint.from, endpoint.to]) {
        if (!ref.startsWith("$") && ref !== "[*]") {
          refs.add(ref);
        }
      }
    }
  }
  return [...refs];
}

// バインディング参照("$x")を展開して、具体的なfrom/toの組を作る。
// バインディングが複数値なら、各値について1件ずつ展開する。
export function expandEndpoints(
  endpoint: Endpoint,
  bindings: Record<string, string[]>,
): Endpoint[] {
  const resolve = (ref: string): string[] => {
    if (ref.startsWith("$")) {
      const values = bindings[ref.slice(1)];
      return values && values.length > 0 ? values : [];
    }
    return [ref];
  };

  const fromValues = resolve(endpoint.from);
  const toValues = resolve(endpoint.to);
  const result: Endpoint[] = [];
  for (const from of fromValues) {
    for (const to of toValues) {
      result.push({ from, to });
    }
  }
  return result;
}
