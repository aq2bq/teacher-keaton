export type VocabularyEntry = {
  id: string;
  kind: string;
};

export type Relation = {
  from: string;
  to: string;
  label: string;
};

export type Input = {
  vocabulary: Record<string, VocabularyEntry>;
  relations: Relation[];
  // 投影(projection.cue)が参照する概念のid。概念マップは構造の図なので、
  // 関係を持たず振る舞いの図だけが意味を担う概念(イベント等)は除外する。
  // 関係を持つ概念と、投影も参照しない孤立概念(関係の書き漏れシグナル)は残す。
  projectionRefs?: string[];
};

export function generate(input: Input): string {
  const referencedByProjection = new Set(input.projectionRefs ?? []);
  const connected = new Set<string>();
  for (const relation of input.relations) {
    connected.add(relation.from);
    connected.add(relation.to);
  }
  const nodes = Object.entries(input.vocabulary)
    .filter(([, entry]) => connected.has(entry.id) || !referencedByProjection.has(entry.id))
    .map(([name, entry]) => ({ id: entry.id, name }))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.name < b.name ? -1 : 1);
  const ids = new Map(nodes.map((node, index) => [node.id, `n${index}`]));
  const lines = ["graph LR"];

  for (const node of nodes) {
    lines.push(`  ${ids.get(node.id)}[${JSON.stringify(node.name)}]`);
  }
  for (const relation of input.relations) {
    const from = ids.get(relation.from);
    const to = ids.get(relation.to);
    if (from === undefined || to === undefined) {
      throw new Error(`relation ${JSON.stringify(relation.from)} -> ${JSON.stringify(relation.to)} references an unknown id`);
    }
    lines.push(`  ${from} -->|${JSON.stringify(relation.label)}| ${to}`);
  }

  return `${lines.join("\n")}\n`;
}

if (import.meta.main) {
  const input = await Bun.stdin.json() as Input;
  process.stdout.write(generate(input));
}
