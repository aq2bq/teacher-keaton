import { describe, expect, test } from "bun:test";
import { renderGlossary, type Glossary } from "./glossary";

describe("renderGlossary", () => {
  test("用語・種別・定義のMarkdown表を作る", () => {
    const glossary: Glossary = {
      "桃太郎": {
        id: "char-momo",
        kind: "character",
        definition: "桃から生まれた男の子。",
      },
    };
    expect(renderGlossary(glossary)).toBe([
      "| 用語 | 種別 | 定義 |",
      "|---|---|---|",
      "| 桃太郎 | character | 桃から生まれた男の子。 |",
    ].join("\n") + "\n");
  });

  test("種別の順に並べ、空のglossaryは空文字を返す", () => {
    const glossary: Glossary = {
      "犬": { id: "char-dog", kind: "character", definition: "仲間。" },
      "桃": { id: "item-momo", kind: "item", definition: "大きな桃。" },
    };
    const output = renderGlossary(glossary);
    const lines = output.trim().split("\n");
    // character が item より先に来る
    expect(lines[2]).toContain("犬");
    expect(lines[3]).toContain("桃");

    expect(renderGlossary({})).toBe("");
  });

  test("セル内のパイプと改行をエスケープする", () => {
    const glossary: Glossary = {
      "用語": { id: "x", kind: "k", definition: "a|b\nc" },
    };
    const output = renderGlossary(glossary);
    expect(output).toContain("a\\|b c");
  });

  test("根拠を持つ概念があれば根拠カラムを出す", () => {
    const glossary: Glossary = {
      "未着手": {
        id: "backlog",
        kind: "status",
        definition: "未着手の状態。",
        sources: [{ location: "src/task.ts:1" }, { location: "設計書.md §2", note: "状態一覧" }],
      },
      "作業中": { id: "active", kind: "status", definition: "作業中の状態。" },
    };
    const output = renderGlossary(glossary);
    expect(output).toContain("| 用語 | 種別 | 定義 | 根拠 |");
    expect(output).toContain("src/task.ts:1 / 設計書.md §2 (状態一覧)");
    // 根拠の無い概念は空セル
    expect(output).toContain("| 作業中 | status | 作業中の状態。 |  |");
  });

  test("根拠を持つ概念が無ければ根拠カラムは出さない", () => {
    const glossary: Glossary = {
      "桃太郎": { id: "char-momo", kind: "character", definition: "桃から生まれた男の子。" },
    };
    expect(renderGlossary(glossary)).not.toContain("根拠");
  });
});
