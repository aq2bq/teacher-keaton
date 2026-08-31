// グロッサリー(用語表)をMarkdownの表へレンダリングする。
// 元データはCUEの glossary(用語→{id,種別,定義,任意で根拠})。

// 観測事実の根拠位置。location は自由形式の位置表記
// ("src/task.ts:1" / "出荷規則.md §3.2" / "在庫.xlsx 'ロット状態'シート")。
// コード以外の文書を事実源にする場合も行番号に縛られないため。
export type Source = {
  location: string;
  note?: string;
};

export type GlossaryEntry = {
  id: string;
  kind: string;
  definition: string;
  sources?: Source[];
};

export type Glossary = Record<string, GlossaryEntry>;

// Markdownの表を壊さないよう、セル内の文字を整える。
function sanitizeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function renderSources(sources: Source[] | undefined): string {
  if (sources === undefined || sources.length === 0) {
    return "";
  }
  return sources
    .map((source) =>
      source.note === undefined
        ? source.location
        : `${source.location} (${source.note})`,
    )
    .join(" / ");
}

export function renderGlossary(glossary: Glossary): string {
  const entries = Object.entries(glossary);
  if (entries.length === 0) {
    return "";
  }

  // 種別でまとめ、その中でid順に並べる(出力を決定論的にする)。
  entries.sort((a, b) => {
    if (a[1].kind !== b[1].kind) {
      return a[1].kind < b[1].kind ? -1 : 1;
    }
    if (a[1].id !== b[1].id) {
      return a[1].id < b[1].id ? -1 : 1;
    }
    return 0;
  });

  // 根拠を持つ概念が一つでもあれば根拠カラムを出す(無ければ表を細く保つ)。
  const hasSources = entries.some(
    ([, entry]) => entry.sources !== undefined && entry.sources.length > 0,
  );
  const lines = hasSources
    ? ["| 用語 | 種別 | 定義 | 根拠 |", "|---|---|---|---|"]
    : ["| 用語 | 種別 | 定義 |", "|---|---|---|"];
  for (const [term, entry] of entries) {
    const base = `| ${sanitizeCell(term)} | ${sanitizeCell(entry.kind)} | ${sanitizeCell(entry.definition)}`;
    lines.push(hasSources ? `${base} | ${sanitizeCell(renderSources(entry.sources))} |` : `${base} |`);
  }
  return lines.join("\n") + "\n";
}
