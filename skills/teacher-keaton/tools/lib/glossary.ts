// グロッサリー(用語表)をMarkdownの表へレンダリングする。
// 元データはCUEの glossary(用語→{id,種別,定義})。

export type GlossaryEntry = {
  id: string;
  kind: string;
  definition: string;
};

export type Glossary = Record<string, GlossaryEntry>;

// Markdownの表を壊さないよう、セル内の文字を整える。
function sanitizeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
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

  const lines = ["| 用語 | 種別 | 定義 |", "|---|---|---|"];
  for (const [term, entry] of entries) {
    lines.push(
      `| ${sanitizeCell(term)} | ${sanitizeCell(entry.kind)} | ${sanitizeCell(entry.definition)} |`,
    );
  }
  return lines.join("\n") + "\n";
}
