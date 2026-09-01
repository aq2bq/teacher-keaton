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
  // 概念マップを一つの概念の近傍へ絞る。concept は用語またはstable id。
  // depth は関係の向きにかかわらず何辺先まで含めるかを示す。
  focus?: { concept: string; depth: number };
};

function resolveFocusId(
  vocabulary: Record<string, VocabularyEntry>,
  concept: string,
): string {
  const matches = new Set<string>();
  const named = vocabulary[concept];
  if (named !== undefined) matches.add(named.id);
  for (const entry of Object.values(vocabulary)) {
    if (entry.id === concept) matches.add(entry.id);
  }
  if (matches.size === 0) {
    throw new Error(
      `focus ${JSON.stringify(concept)} does not match a vocabulary name or id`,
    );
  }
  if (matches.size > 1) {
    throw new Error(
      `focus ${JSON.stringify(concept)} is ambiguous: ${[...matches].join(", ")}`,
    );
  }
  return matches.values().next().value as string;
}

function collectNeighborhood(
  focusId: string,
  depth: number,
  relations: Relation[],
): Set<string> {
  const included = new Set([focusId]);
  let frontier = new Set([focusId]);
  for (let distance = 0; distance < depth; distance += 1) {
    const next = new Set<string>();
    for (const relation of relations) {
      if (frontier.has(relation.from) && !included.has(relation.to)) {
        next.add(relation.to);
      }
      if (frontier.has(relation.to) && !included.has(relation.from)) {
        next.add(relation.from);
      }
    }
    for (const id of next) included.add(id);
    frontier = next;
    if (frontier.size === 0) break;
  }
  return included;
}

export function generate(input: Input): string {
  const vocabularyIds = new Set(
    Object.values(input.vocabulary).map((entry) => entry.id),
  );
  for (const relation of input.relations) {
    if (!vocabularyIds.has(relation.from) || !vocabularyIds.has(relation.to)) {
      throw new Error(
        `relation ${JSON.stringify(relation.from)} -> ` +
          `${JSON.stringify(relation.to)} references an unknown id`,
      );
    }
  }

  let focusedIds: Set<string> | undefined;
  if (input.focus !== undefined) {
    if (!Number.isInteger(input.focus.depth) || input.focus.depth < 0) {
      throw new Error("focus depth must be a non-negative integer");
    }
    focusedIds = collectNeighborhood(
      resolveFocusId(input.vocabulary, input.focus.concept),
      input.focus.depth,
      input.relations,
    );
  }

  const referencedByProjection = new Set(input.projectionRefs ?? []);
  const connected = new Set<string>();
  for (const relation of input.relations) {
    connected.add(relation.from);
    connected.add(relation.to);
  }
  const nodes = Object.entries(input.vocabulary)
    .filter(([, entry]) =>
      focusedIds === undefined
        ? connected.has(entry.id) || !referencedByProjection.has(entry.id)
        : focusedIds.has(entry.id),
    )
    .map(([name, entry]) => ({ id: entry.id, name }))
    .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : a.name < b.name ? -1 : 1);
  const ids = new Map(nodes.map((node, index) => [node.id, `n${index}`]));
  const relations = focusedIds === undefined
    ? input.relations
    : input.relations.filter(
      (relation) => focusedIds.has(relation.from) && focusedIds.has(relation.to),
    );
  const lines = ["graph LR"];

  for (const node of nodes) {
    lines.push(`  ${ids.get(node.id)}[${JSON.stringify(node.name)}]`);
  }
  for (const relation of relations) {
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
