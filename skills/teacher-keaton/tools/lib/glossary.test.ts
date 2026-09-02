import { describe, expect, test } from "bun:test";
import {
  renderGlossary,
  validateGlossaryProvenance,
  type Glossary,
} from "./glossary";

const observed = (id: string, kind: string, definition: string) => ({
  id,
  kind,
  definition,
  origin: "observed" as const,
  sources: [{ location: "原資料.md §1" }],
});

describe("renderGlossary", () => {
  test("用語、種別、定義、原資料の根拠をMarkdown表にする", () => {
    const glossary: Glossary = {
      "桃太郎": observed("char-momo", "character", "桃から生まれた男の子。"),
    };
    expect(renderGlossary(glossary)).toBe([
      "| 用語 | 種別 | 定義 | 根拠 |",
      "|---|---|---|---|",
      "| 桃太郎 | character | 桃から生まれた男の子。 | 原資料: 原資料.md §1 |",
    ].join("\n") + "\n");
  });

  test("種別の順に並べ、空のglossaryは空文字を返す", () => {
    const glossary: Glossary = {
      "犬": observed("char-dog", "character", "仲間。"),
      "桃": observed("item-momo", "item", "大きな桃。"),
    };
    const output = renderGlossary(glossary);
    const lines = output.trim().split("\n");
    expect(lines[2]).toContain("犬");
    expect(lines[3]).toContain("桃");
    expect(renderGlossary({})).toBe("");
  });

  test("セル内のパイプと改行をエスケープする", () => {
    const glossary: Glossary = {
      "用語": observed("x", "k", "a|b\nc"),
    };
    expect(renderGlossary(glossary)).toContain("a\\|b c");
  });

  test("推論由来は理由と基にした観測位置を同じ根拠セルへ出す", () => {
    const glossary: Glossary = {
      "重複開始を拒否": {
        id: "event-reject-duplicate-start",
        kind: "event",
        definition: "状態を変えずに拒否する。",
        origin: "inferred",
        sources: [{ location: "src/task.ts:54", note: "active以外だけ開始できる" }],
        inferenceReason: "状態が変わらない試みを投影可能なイベントとして区別するため。",
      },
    };
    const output = renderGlossary(glossary);
    expect(output).toContain("推論: 状態が変わらない試みを投影可能なイベントとして区別するため。");
    expect(output).toContain("観測位置: src/task.ts:54 (active以外だけ開始できる)");
  });
});

describe("validateGlossaryProvenance", () => {
  test("全概念に観測位置を要求し、推論由来には理由も要求する", () => {
    const glossary = {
      "由来なし": { id: "missing-origin", kind: "state", definition: "由来なし。", sources: [] },
      "理由なし": {
        id: "missing-reason",
        kind: "event",
        definition: "理由なし。",
        origin: "inferred",
        sources: [{ location: "src/example.ts:1" }],
      },
    } as unknown as Glossary;

    const errors = validateGlossaryProvenance(glossary);
    expect(errors).toContain('用語 "由来なし" (id: "missing-origin") の origin は observed または inferred でなければなりません');
    expect(errors).toContain('用語 "由来なし" (id: "missing-origin") に観測位置 sources が1件以上必要です');
    expect(errors).toContain('用語 "理由なし" (id: "missing-reason") は inferred なので inferenceReason が必要です');
  });

  test("原資料由来に推論理由を混在させない", () => {
    const glossary = {
      "原資料由来": {
        ...observed("observed", "state", "原資料由来。"),
        inferenceReason: "不要な理由。",
      },
    };
    expect(validateGlossaryProvenance(glossary)).toContain(
      '用語 "原資料由来" (id: "observed") は observed なので inferenceReason を持てません',
    );
  });
});
