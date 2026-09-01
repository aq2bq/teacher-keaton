import { describe, expect, test } from "bun:test";
import {
  detectEvents,
  expandEndpoints,
  makeProjectionContext,
  validateProjectionVars,
  type ProjectionSpec,
  type Trace,
} from "./projection";
import type { Measures } from "./measures";
import { makeLabelResolver, render } from "./render";

// ITFの包み({"#set":...} や {"#bigint":...})を模した状態を作る補助。
const set = (...items: string[]) => ({ "#set": items });
const int = (value: number) => ({ "#bigint": String(value) });

describe("detectEvents", () => {
  test("setGains+intDecreases をANDで検出し、増えた要素をbindする", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-give",
          when: [
            { kind: "setGains", var: "companions", bind: "to" },
            { kind: "intDecreases", var: "dango" },
          ],
          message: { from: "char-momo", to: "$to" },
        },
      ],
    };
    const trace: Trace = {
      states: [
        { companions: set(), dango: int(3) },
        { companions: set("char-dog"), dango: int(2) },
      ],
    };
    const steps = detectEvents(trace, spec);
    expect(steps.length).toBe(1);
    expect(steps[0][0].event).toBe("event-give");
    expect(steps[0][0].bindings.to).toEqual(["char-dog"]);
  });

  test("move で集合間の移動を検出する", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-start",
          when: [{ kind: "move", from: "backlog", to: "active" }],
          transition: { from: "backlog", to: "active" },
        },
      ],
    };
    const trace: Trace = {
      states: [
        { backlog: set("1"), active: set() },
        { backlog: set(), active: set("1") },
      ],
    };
    const steps = detectEvents(trace, spec);
    expect(steps.length).toBe(1);
    expect(steps[0][0].event).toBe("event-start");
  });

  test("when の一部が不成立なら発火しない", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-give",
          when: [
            { kind: "setGains", var: "companions", bind: "to" },
            { kind: "intDecreases", var: "dango" },
          ],
          message: { from: "a", to: "$to" },
        },
      ],
    };
    // 仲間は増えたが dango は減っていない → 発火しない
    const trace: Trace = {
      states: [
        { companions: set(), dango: int(3) },
        { companions: set("char-dog"), dango: int(3) },
      ],
    };
    expect(detectEvents(trace, spec).length).toBe(0);
  });

  test("boolBecomes でフラグの立ち上がりを検出する", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-depart",
          when: [{ kind: "boolBecomes", var: "departed", value: true }],
          message: { from: "a", to: "a" },
        },
      ],
    };
    const trace: Trace = {
      states: [{ departed: false }, { departed: true }],
    };
    expect(detectEvents(trace, spec).length).toBe(1);
  });

  test("sequenceAppends で観測ログへの記録を検出し、値で絞り込める", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-reject-start-busy",
          when: [
            {
              kind: "sequenceAppends",
              var: "observedEvents",
              value: "event-reject-start-busy",
              bind: "ev",
            },
          ],
          transition: { from: "active", to: "active" },
        },
      ],
    };
    // 記録が追加された遷移 → 発火
    const fired: Trace = {
      states: [
        { observedEvents: [] },
        { observedEvents: ["event-reject-start-busy"] },
      ],
    };
    const steps = detectEvents(fired, spec);
    expect(steps.length).toBe(1);
    expect(steps[0][0].bindings.ev).toEqual(["event-reject-start-busy"]);

    // 別の値の記録 → 絞り込みで発火しない
    const other: Trace = {
      states: [
        { observedEvents: [] },
        { observedEvents: ["event-other"] },
      ],
    };
    expect(detectEvents(other, spec).length).toBe(0);

    // 状態を変えない自己遷移でも、ログの変化だけで発火する
    const selfLoop: Trace = {
      states: [
        { observedEvents: ["event-reject-start-busy"], activeTaskIds: set("1") },
        { observedEvents: ["event-reject-start-busy", "event-reject-start-busy"], activeTaskIds: set("1") },
      ],
    };
    expect(detectEvents(selfLoop, spec).length).toBe(1);
  });
});

describe("validateProjectionVars", () => {
  const spec: ProjectionSpec = {
    events: [
      {
        event: "event-start",
        when: [{ kind: "move", from: "backlogIds", to: "activeIds" }],
        transition: { from: "backlog", to: "active" },
      },
      {
        event: "event-give",
        when: [
          { kind: "setGains", var: "companions", bind: "to" },
          { kind: "intDecreases", var: "dango" },
        ],
        message: { from: "a", to: "$to" },
      },
    ],
  };

  test("宣言済みの変数だけを参照していればエラーは無い", () => {
    const declared = ["backlogIds", "activeIds", "companions", "dango"];
    expect(validateProjectionVars(spec, declared)).toEqual([]);
  });

  test("未知の変数を参照していれば、イベント名付きで報告する", () => {
    const declared = ["backlogIds", "companions", "dango"];
    const errors = validateProjectionVars(spec, declared);
    expect(errors).toEqual([
      'projection.cue: event "event-start" の when が未知のQuint変数 "activeIds" を参照',
    ]);
  });
});

describe("expandEndpoints", () => {
  test("$bind を展開し、リテラルはそのまま通す", () => {
    const endpoints = expandEndpoints(
      { from: "char-momo", to: "$to" },
      { to: ["char-dog", "char-monkey"] },
    );
    expect(endpoints.length).toBe(2);
    expect(endpoints[0].to).toBe("char-dog");
    expect(endpoints[1].to).toBe("char-monkey");
    expect(endpoints[0].from).toBe("char-momo");
  });
});

describe("render", () => {
  // 語彙: 参加者・状態に加え、イベントも概念として含む。
  const vocabulary = {
    "桃太郎": { id: "char-momo", kind: "character" },
    "犬": { id: "char-dog", kind: "character" },
    "未着手": { id: "backlog", kind: "status" },
    "作業中": { id: "active", kind: "status" },
    "きびだんごを与える": { id: "event-give", kind: "event" },
    "開始": { id: "event-start", kind: "event" },
  };
  const resolve = makeLabelResolver(vocabulary);

  test("sequenceDiagram のラベルはイベントの語彙表示名から解決する", () => {
    const spec: ProjectionSpec = {
      format: "sequenceDiagram",
      events: [
        {
          event: "event-give",
          when: [
            { kind: "setGains", var: "companions", bind: "to" },
            { kind: "intDecreases", var: "dango" },
          ],
          message: { from: "char-momo", to: "$to" },
        },
      ],
    };
    const trace: Trace = {
      states: [
        { companions: set(), dango: int(1) },
        { companions: set("char-dog"), dango: int(0) },
      ],
    };
    const output = render("sequenceDiagram", detectEvents(trace, spec), resolve);
    expect(output).toContain("participant N0 as 桃太郎");
    expect(output).toContain("participant N1 as 犬");
    expect(output).toContain("N0->>N1: きびだんごを与える");
  });

  test("stateDiagram のラベルはイベントの語彙表示名から解決する", () => {
    const spec: ProjectionSpec = {
      format: "stateDiagram",
      events: [
        {
          event: "event-start",
          when: [{ kind: "move", from: "backlog", to: "active" }],
          transition: { from: "backlog", to: "active" },
        },
      ],
    };
    const trace: Trace = {
      states: [
        { backlog: set("1"), active: set() },
        { backlog: set(), active: set("1") },
      ],
    };
    const output = render("stateDiagram", detectEvents(trace, spec), resolve);
    expect(output).toContain("stateDiagram-v2");
    expect(output).toContain("N0: 未着手");
    expect(output).toContain("N1: 作業中");
    expect(output).toContain("N0 --> N1: 開始");
  });

  test("json は語彙で解決したラベルを載せたイベント列を出力する", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-start",
          when: [{ kind: "move", from: "backlog", to: "active" }],
          transition: { from: "backlog", to: "active" },
        },
      ],
    };
    const trace: Trace = {
      states: [
        { backlog: set("1"), active: set() },
        { backlog: set(), active: set("1") },
      ],
    };
    const output = render("json", detectEvents(trace, spec), resolve);
    const parsed = JSON.parse(output);
    expect(parsed[0]).toEqual({
      event: "event-start",
      from: "backlog",
      to: "active",
      label: "開始",
    });
  });

  test("語彙に無いidは黙って図に出さず失敗する", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-unknown",
          when: [{ kind: "move", from: "backlog", to: "active" }],
          transition: { from: "backlog", to: "active" },
        },
      ],
    };
    const trace: Trace = {
      states: [
        { backlog: set("1"), active: set() },
        { backlog: set(), active: set("1") },
      ],
    };
    expect(() => render("stateDiagram", detectEvents(trace, spec), resolve)).toThrow(
      "unknown id: event-unknown",
    );
  });
});

// 測度の投影: 増加が悪化かどうかはCUEの極性から解決される。
// 投影仕様に向きを書かないので、極性を直せば図が自動で追随する。
describe("測度の述語", () => {
  const measures: Measures = {
    annoyance: {
      id: "measure-annoyance",
      preferredName: "気になる度",
      definition: "困りごとの強さ。",
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
  const context = makeProjectionContext(measures);

  const worsensSpec: ProjectionSpec = {
    events: [
      {
        event: "event-worsen",
        when: [{ kind: "measureWorsens", var: "annoyance", measure: "measure-annoyance" }],
        transition: { from: "calm", to: "calm" },
      },
    ],
  };

  test("小さいほど良い尺度では、増加が悪化になる", () => {
    const trace: Trace = { states: [{ annoyance: int(1) }, { annoyance: int(2) }] };
    expect(detectEvents(trace, worsensSpec, context).length).toBe(1);
  });

  test("同じ増加でも、極性が逆なら悪化にならない", () => {
    const flipped = makeProjectionContext({
      annoyance: { ...measures.annoyance, polarity: "higherIsBetter" },
    });
    const trace: Trace = { states: [{ annoyance: int(1) }, { annoyance: int(2) }] };
    expect(detectEvents(trace, worsensSpec, flipped).length).toBe(0);
  });

  test("改善は悪化の逆向きとして検出される", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-improve",
          when: [{ kind: "measureImproves", var: "annoyance", measure: "measure-annoyance" }],
          transition: { from: "alert", to: "calm" },
        },
      ],
    };
    const trace: Trace = { states: [{ annoyance: int(4) }, { annoyance: int(2) }] };
    expect(detectEvents(trace, spec, context).length).toBe(1);
  });

  test("閾値の跨ぎは、跨いだ遷移でだけ成立する", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "event-enter-alert",
          when: [{
            kind: "measureEntersWorseSide",
            var: "annoyance",
            measure: "measure-annoyance",
            threshold: "threshold-annoyance-high",
          }],
          transition: { from: "calm", to: "alert" },
        },
      ],
    };
    // 1→2 は悪い側へ入らない。2→3 は閾値(3以上が悪い側)を跨ぐ。
    const trace: Trace = {
      states: [{ annoyance: int(1) }, { annoyance: int(2) }, { annoyance: int(3) }],
    };
    const steps = detectEvents(trace, spec, context);
    expect(steps.length).toBe(1);
    expect(steps[0][0].event).toBe("event-enter-alert");
  });

  test("極性が決まらない測度は、悪化と改善を決められないので失敗する", () => {
    const unresolved = makeProjectionContext({
      annoyance: { ...measures.annoyance, polarity: "unresolved" },
    });
    const trace: Trace = { states: [{ annoyance: int(1) }, { annoyance: int(2) }] };
    expect(() => detectEvents(trace, worsensSpec, unresolved)).toThrow(/極性/);
  });

  test("測度が未宣言なら黙って何も出さず、失敗する", () => {
    const trace: Trace = { states: [{ annoyance: int(1) }, { annoyance: int(2) }] };
    expect(() => detectEvents(trace, worsensSpec)).toThrow(/measures/);
  });
});
