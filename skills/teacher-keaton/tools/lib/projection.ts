// 汎用投影エンジン: 宣言的な投影仕様とQuintのトレースから、
// 形式に依存しないイベント列を生成する。
//
// 設計原則(リポジトリの汎化の結論):
//   - 参加者・ラベルの「語彙」はCUEが原本(このライブラリは語彙を保持しない)
//   - 「状態差分をどう意味づけるか」だけが投影仕様に宣言される
//   - 本ライブラリは仕様とトレースを読み、イベント列を導出するだけの
//     汎用の機械であり、特定アプリの固有名詞を一切含まない

// ---------- 投影仕様の型 ----------

// 状態差分を検出する最小の述語。必要になったら拡張する。
export type DiffPredicate =
  | { kind: "setGains"; var: string; bind?: string }
  | { kind: "setLoses"; var: string; bind?: string }
  | { kind: "move"; from: string; to: string; bind?: string }
  | { kind: "intDecreases"; var: string }
  | { kind: "intIncreases"; var: string }
  | { kind: "boolBecomes"; var: string; value: boolean };

// from/to は「stable id のリテラル」または「"$<bind>" のバインディング参照」。
export type Endpoint = { from: string; to: string; label: string };

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

// ---------- 述語の評価 ----------

type PredicateResult = { holds: boolean; bindings: Record<string, string[]> };

function evaluatePredicate(
  predicate: DiffPredicate,
  prev: TraceState,
  curr: TraceState,
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
  }
}

// ---------- イベント検出 ----------

// 隣接状態の各ペアについて、仕様を満たすイベントを検出する。
// 戻り値は「遷移ごとの発火イベント列」で、順序は仕様内の規則順。
export function detectEvents(trace: Trace, spec: ProjectionSpec): FiredEvent[][] {
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
        const result = evaluatePredicate(predicate, prev, curr);
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
      result.push({ from, to, label: endpoint.label });
    }
  }
  return result;
}
