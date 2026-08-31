// イベント列を具体的な図形式へレンダリングする。
// エンジンが作った形式非依存のイベント列を受け取るため、
// ここに形式を追加してもエンジンや投影仕様は変わらない。
// 表示ラベルはCUEのvocabulary(id→呼称)から解決する。

import {
  expandEndpoints,
  type FiredEvent,
} from "./projection";

// CUEのvocabularyは「呼称→{id,kind}」なので、表示用に「id→呼称」へ反転する。
// 未知のidは黙って通さず失敗する: 図に出る語はすべて語彙に存在しなければならず、
// 語彙に無い語が図に混ざる(=モデルに存在しない語の生成)を防ぐ。
export type LabelResolver = (id: string) => string;

export function makeLabelResolver(
  vocabulary: Record<string, { id: string; kind: string }>,
): LabelResolver {
  const labelById = new Map<string, string>();
  for (const [label, entry] of Object.entries(vocabulary)) {
    labelById.set(entry.id, label);
  }
  return (id: string) => {
    const label = labelById.get(id);
    if (label === undefined) {
      throw new Error(`unknown id: ${id} — CUEのvocabularyに存在しません`);
    }
    return label;
  };
}

// 発火イベント列を、バインディング展開済みの具体イベントへ潰す。
type Expanded = { event: string; from: string; to: string };

function expandAll(steps: FiredEvent[][], key: "message" | "transition"): Expanded[] {
  const result: Expanded[] = [];
  for (const step of steps) {
    for (const fired of step) {
      const endpoint = fired[key];
      if (!endpoint) continue;
      for (const e of expandEndpoints(endpoint, fired.bindings)) {
        result.push({ event: fired.event, from: e.from, to: e.to });
      }
    }
  }
  return result;
}

// Mermaidの識別子として安全な別名を作る(表示名は日本語になり得るため)。
function makeAliases(ids: string[]): Map<string, string> {
  const aliases = new Map<string, string>();
  ids.forEach((id, index) => aliases.set(id, `N${index}`));
  return aliases;
}

export function renderSequenceDiagram(
  steps: FiredEvent[][],
  resolve: LabelResolver,
): string {
  const events = expandAll(steps, "message");
  const participantIds: string[] = [];
  for (const e of events) {
    for (const id of [e.from, e.to]) {
      if (!participantIds.includes(id)) participantIds.push(id);
    }
  }
  const aliases = makeAliases(participantIds);
  const lines: string[] = ["sequenceDiagram"];
  for (const id of participantIds) {
    lines.push(`  participant ${aliases.get(id)} as ${resolve(id)}`);
  }
  for (const e of events) {
    lines.push(`  ${aliases.get(e.from)}->>${aliases.get(e.to)}: ${resolve(e.event)}`);
  }
  return lines.join("\n") + "\n";
}

export function renderStateDiagram(
  steps: FiredEvent[][],
  resolve: LabelResolver,
): string {
  const events = expandAll(steps, "transition");
  const stateIds: string[] = [];
  for (const e of events) {
    for (const id of [e.from, e.to]) {
      if (id !== "[*]" && !stateIds.includes(id)) stateIds.push(id);
    }
  }
  const aliases = makeAliases(stateIds);
  const lines: string[] = ["stateDiagram-v2"];
  for (const id of stateIds) {
    lines.push(`  ${aliases.get(id)}: ${resolve(id)}`);
  }
  const seen = new Set<string>();
  for (const e of events) {
    const fromAlias = e.from === "[*]" ? "[*]" : aliases.get(e.from);
    const toAlias = e.to === "[*]" ? "[*]" : aliases.get(e.to);
    const label = resolve(e.event);
    const key = `${fromAlias}->${toAlias}:${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`  ${fromAlias} --> ${toAlias}: ${label}`);
  }
  return lines.join("\n") + "\n";
}

// 形式非依存のイベント列そのものをJSONで出す(投影の中間表現)。
// ラベルはイベントのstable idから語彙の表示名へ解決したものを載せる。
export function renderJson(steps: FiredEvent[][], resolve: LabelResolver): string {
  const flat = expandAll(steps, "message").concat(expandAll(steps, "transition"));
  const labeled = flat.map((e) => ({ ...e, label: resolve(e.event) }));
  return JSON.stringify(labeled, null, 2) + "\n";
}

export function render(
  format: string,
  steps: FiredEvent[][],
  resolve: LabelResolver,
): string {
  switch (format) {
    case "sequenceDiagram":
      return renderSequenceDiagram(steps, resolve);
    case "stateDiagram":
      return renderStateDiagram(steps, resolve);
    case "json":
      return renderJson(steps, resolve);
    default:
      throw new Error(`unknown format: ${format}`);
  }
}
