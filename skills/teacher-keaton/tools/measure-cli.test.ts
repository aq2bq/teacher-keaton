import { expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const tool = (name: string) => resolve(import.meta.dir, name);
const fixture = resolve(import.meta.dir, "fixtures/measure-spec");

async function run(name: string, specPath: string) {
  const child = Bun.spawn([tool(name), specPath], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

// specディレクトリ名から定数モジュール名が決まるため、名前を保って複製する。
function copyFixture(): { specPath: string; cleanup: () => void } {
  const directory = mkdtempSync(join(tmpdir(), "keaton-measure-"));
  const specPath = join(directory, "measure-spec");
  cpSync(fixture, specPath, { recursive: true });
  return { specPath, cleanup: () => rmSync(directory, { recursive: true, force: true }) };
}

function edit(path: string, from: string, to: string): void {
  const text = readFileSync(path, "utf-8");
  if (!text.includes(from)) {
    throw new Error(`fixtureの前提が変わっています: ${from}`);
  }
  writeFileSync(path, text.replace(from, to));
}

test("測度つきspecは、構造検証と整合検査を通る", async () => {
  const vet = await run("vet", fixture);
  expect(vet.exitCode).toBe(0);
  expect(vet.stdout).toContain("positives 1/1 通過");
  expect(vet.stdout).toContain("negatives 1/1 拒否");

  const consistency = await run("check-consistency", fixture);
  expect(consistency.exitCode).toBe(0);
  expect(consistency.stdout).toContain("2 used in Quint");
  expect(consistency.stdout).toContain("1 measures");
  expect(consistency.stderr).not.toContain("モデルの穴");
});

test("用語表に観測位置のない概念があれば整合検査を拒否する", async () => {
  const { specPath, cleanup } = copyFixture();
  try {
    edit(
      join(specPath, "spec.cue"),
      "origin: x.origin, sources: x.sources",
      "origin: x.origin",
    );
    const result = await run("check-consistency", specPath);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("観測位置 sources が1件以上必要です");
  } finally {
    cleanup();
  }
});

test("閾値の生成記号は参照したときだけ使用済みになり、importだけでは数えない", async () => {
  const { specPath, cleanup } = copyFixture();
  try {
    edit(
      join(specPath, "model.qnt"),
      "alerted' = thresholdAnnoyanceHighIsWorseSide(annoyance + 1)",
      "alerted' = alerted",
    );
    edit(
      join(specPath, "model.qnt"),
      "alerted' = thresholdAnnoyanceHighIsWorseSide(annoyance - 1)",
      "alerted' = alerted",
    );
    edit(
      join(specPath, "model.qnt"),
      "alerted == thresholdAnnoyanceHighIsWorseSide(annoyance)",
      "alerted == alerted",
    );

    const result = await run("check-consistency", specPath);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("1 used in Quint");
    expect(result.stderr).toContain(
      "threshold-annoyance-high はquintExpectedに挙がっていますがQuintのモデルで使用されていません",
    );
    expect(result.stderr).not.toContain(
      "measure-annoyance はquintExpectedに挙がっていますがQuintのモデルで使用されていません",
    );
  } finally {
    cleanup();
  }
});

test("測度のquintVarに対応する変数がなければ使用済みにせず失敗する", async () => {
  const { specPath, cleanup } = copyFixture();
  try {
    edit(join(specPath, "model.qnt"), "  var annoyance: int\n", "");
    const result = await run("check-consistency", specPath);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain(
      '測度 "measure-annoyance" の quintVar "annoyance" はQuintで宣言されていません',
    );
  } finally {
    cleanup();
  }
});

test("測度表は、範囲だけでなく極性と閾値の意味を出す", async () => {
  const measures = await run("measures", fixture);
  expect(measures.exitCode).toBe(0);
  expect(measures.stdout).toContain("大きいほど悪い(小さいほど良い)");
  expect(measures.stdout).toContain("3 以上が悪い側 → 要対応として扱う");
});

// 極性のミューテーション: 宣言した向きを反転させると用例が落ちること。
// 落ちないなら、極性はモデルのどこにも効いておらず、宣言が飾りになっている。
test("極性を反転させると、意味の用例が落ちる(極性が荷重部材であることの証明)", async () => {
  const { specPath, cleanup } = copyFixture();
  try {
    // 宣言(#Polarityの定義ではなく実際の測度の極性)だけを反転させる。
    edit(
      join(specPath, "spec.cue"),
      'polarity:      "lowerIsBetter"',
      'polarity:      "higherIsBetter"',
    );
    const vet = await run("vet", specPath);
    expect(vet.exitCode).not.toBe(0);
    expect(vet.stderr).toContain("正例が拒否されました");
  } finally {
    cleanup();
  }
});

test("閾値を生の比較で書くと、整合検査が拒否する", async () => {
  const { specPath, cleanup } = copyFixture();
  try {
    edit(
      join(specPath, "model.qnt"),
      "alerted' = thresholdAnnoyanceHighIsWorseSide(annoyance + 1)",
      "alerted' = (annoyance + 1 >= 3)",
    );
    const result = await run("check-consistency", specPath);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("生の比較");
  } finally {
    cleanup();
  }
});

// 生成された定数を使っていても、向きを手で書けば同じ誤りが起きうる。
test("生成された閾値定数との比較を手書きしても拒否する", async () => {
  const { specPath, cleanup } = copyFixture();
  try {
    edit(
      join(specPath, "model.qnt"),
      "alerted' = thresholdAnnoyanceHighIsWorseSide(annoyance + 1)",
      "alerted' = (annoyance + 1 <= thresholdAnnoyanceHighAt)",
    );
    const result = await run("check-consistency", specPath);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("thresholdAnnoyanceHighIsWorseSide");
  } finally {
    cleanup();
  }
});

test("測度の範囲との比較は生の比較ではないので、誤検出しない", async () => {
  // fixture の model.qnt は annoyance < 10 / annoyance > 0(範囲の境界)を含む。
  const model = readFileSync(join(fixture, "model.qnt"), "utf-8");
  expect(model).toContain("annoyance < 10");
  const result = await run("check-consistency", fixture);
  expect(result.exitCode).toBe(0);
});
