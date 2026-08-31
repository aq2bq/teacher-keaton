import { describe, expect, test } from "bun:test";
import {
  detectEvents,
  expandEndpoints,
  validateProjectionVars,
  type ProjectionSpec,
  type Trace,
} from "./projection";
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
