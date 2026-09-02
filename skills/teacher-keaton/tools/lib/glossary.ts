// グロッサリー(用語表)をMarkdownの表へレンダリングする。
// 元データはCUEの glossary(用語→{id,種別,定義,由来,根拠})。

// 観測事実の根拠位置。location は自由形式の位置表記
// ("src/task.ts:1" / "出荷規則.md §3.2" / "在庫.xlsx 'ロット状態'シート")。
// コード以外の文書を事実源にする場合も行番号に縛られないため。
export type Source = {
  location: string;
  note?: string;
};

export type ConceptOrigin = "observed" | "inferred";

export type ConceptProvenance = {
  origin: ConceptOrigin;
  sources: Source[];
  inferenceReason?: string;
};

export type GlossaryEntry = ConceptProvenance & {
  id: string;
  kind: string;
  definition: string;
};

export type Glossary = Record<string, GlossaryEntry>;

// Markdownの表を壊さないよう、セル内の文字を整える。
function sanitizeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function renderSources(sources: Source[]): string {
  return sources
    .map((source) =>
      source.note === undefined
        ? source.location
        : `${source.location} (${source.note})`,
    )
    .join(" / ");
}

function renderProvenance(entry: GlossaryEntry): string {
  const sources = renderSources(entry.sources);
  if (entry.origin === "inferred") {
    return `推論: ${entry.inferenceReason} / 観測位置: ${sources}`;
  }
  return `原資料: ${sources}`;
}

// CUEスキーマを独自定義したspecでも、根拠のない概念を投影させない。
export function validateGlossaryProvenance(glossary: Glossary): string[] {
  const errors: string[] = [];
  for (const [term, entry] of Object.entries(glossary)) {
    const subject = `用語 ${JSON.stringify(term)} (id: ${JSON.stringify(entry.id)})`;
    if (entry.origin !== "observed" && entry.origin !== "inferred") {
      errors.push(`${subject} の origin は observed または inferred でなければなりません`);
    }
    if (!Array.isArray(entry.sources) || entry.sources.length === 0) {
      errors.push(`${subject} に観測位置 sources が1件以上必要です`);
    } else {
      entry.sources.forEach((source, index) => {
        if (typeof source.location !== "string" || source.location.trim().length === 0) {
          errors.push(`${subject} の sources[${index}].location は空にできません`);
        }
      });
    }
    if (entry.origin === "inferred") {
      if (typeof entry.inferenceReason !== "string" || entry.inferenceReason.trim().length === 0) {
        errors.push(`${subject} は inferred なので inferenceReason が必要です`);
      }
    } else if (entry.inferenceReason !== undefined) {
      errors.push(`${subject} は observed なので inferenceReason を持てません`);
    }
  }
  return errors;
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

  const lines = ["| 用語 | 種別 | 定義 | 根拠 |", "|---|---|---|---|"];
  for (const [term, entry] of entries) {
    const base = `| ${sanitizeCell(term)} | ${sanitizeCell(entry.kind)} | ${sanitizeCell(entry.definition)}`;
    lines.push(`${base} | ${sanitizeCell(renderProvenance(entry))} |`);
  }
  return lines.join("\n") + "\n";
}
