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
};

export function generate(input: Input): string {
  const nodes = Object.entries(input.vocabulary)
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
