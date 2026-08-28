import { describe, expect, test } from "bun:test";
import {
  detectEvents,
  expandEndpoints,
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
          event: "give",
          when: [
            { kind: "setGains", var: "companions", bind: "to" },
            { kind: "intDecreases", var: "dango" },
          ],
          message: { from: "char-momo", to: "$to", label: "与える" },
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
    expect(steps[0][0].event).toBe("give");
    expect(steps[0][0].bindings.to).toEqual(["char-dog"]);
  });

  test("move で集合間の移動を検出する", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "start",
          when: [{ kind: "move", from: "backlog", to: "active" }],
          transition: { from: "backlog", to: "active", label: "start" },
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
    expect(steps[0][0].event).toBe("start");
  });

  test("when の一部が不成立なら発火しない", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "give",
          when: [
            { kind: "setGains", var: "companions", bind: "to" },
            { kind: "intDecreases", var: "dango" },
          ],
          message: { from: "a", to: "$to", label: "x" },
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
          event: "depart",
          when: [{ kind: "boolBecomes", var: "departed", value: true }],
          message: { from: "a", to: "a", label: "出発" },
        },
      ],
    };
    const trace: Trace = {
      states: [{ departed: false }, { departed: true }],
    };
    expect(detectEvents(trace, spec).length).toBe(1);
  });
});

describe("expandEndpoints", () => {
  test("$bind を展開し、リテラルはそのまま通す", () => {
    const endpoints = expandEndpoints(
      { from: "char-momo", to: "$to", label: "与える" },
      { to: ["char-dog", "char-monkey"] },
    );
    expect(endpoints.length).toBe(2);
    expect(endpoints[0].to).toBe("char-dog");
    expect(endpoints[1].to).toBe("char-monkey");
    expect(endpoints[0].from).toBe("char-momo");
  });
});

describe("render", () => {
  const vocabulary = {
    "桃太郎": { id: "char-momo", kind: "character" },
    "犬": { id: "char-dog", kind: "character" },
    "未着手": { id: "backlog", kind: "status" },
    "作業中": { id: "active", kind: "status" },
  };
  const resolve = makeLabelResolver(vocabulary);

  test("sequenceDiagram は語彙を表示名に解決する", () => {
    const spec: ProjectionSpec = {
      format: "sequenceDiagram",
      events: [
        {
          event: "give",
          when: [
            { kind: "setGains", var: "companions", bind: "to" },
            { kind: "intDecreases", var: "dango" },
          ],
          message: { from: "char-momo", to: "$to", label: "与える" },
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
    expect(output).toContain("N0->>N1: 与える");
  });

  test("stateDiagram は状態遷移を描く", () => {
    const spec: ProjectionSpec = {
      format: "stateDiagram",
      events: [
        {
          event: "start",
          when: [{ kind: "move", from: "backlog", to: "active" }],
          transition: { from: "backlog", to: "active", label: "start" },
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
    expect(output).toContain("N0 --> N1: start");
  });

  test("json は形式非依存のイベント列を出力する", () => {
    const spec: ProjectionSpec = {
      events: [
        {
          event: "start",
          when: [{ kind: "move", from: "backlog", to: "active" }],
          transition: { from: "backlog", to: "active", label: "start" },
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
      event: "start",
      from: "backlog",
      to: "active",
      label: "start",
    });
  });
});
