import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPromptFromText } from "../src/commands/prompt.js";
import type { PromptIntent } from "../src/prompt/types.js";

type PromptExample = {
  id: string;
  lang: string;
  expectedIntent: PromptIntent;
  rawPrompt: string;
};

const examplesPath = new URL(
  "../doc/guide/PROMPT_EXAMPLES.md",
  import.meta.url,
);

function parsePromptExamples(markdown: string): PromptExample[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\| [PM]\d{3} \|/.test(line))
    .map((line) => {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());

      return {
        id: cells[0]!,
        lang: cells[1]!,
        expectedIntent: cells[2] as PromptIntent,
        rawPrompt: cells[3]!,
      };
    });
}

describe("prompt example suite", () => {
  const examples = parsePromptExamples(readFileSync(examplesPath, "utf8"));

  it("contains enough bilingual prompt examples for rule tuning", () => {
    expect(examples.length).toBeGreaterThanOrEqual(100);
    expect(examples.length).toBeLessThanOrEqual(150);
    expect(examples.some((example) => example.lang === "vi")).toBe(true);
    expect(examples.some((example) => example.lang === "en")).toBe(true);
    expect(examples.some((example) => example.lang === "mix")).toBe(true);
  });

  it.each(examples)(
    "$id classifies as $expectedIntent: $rawPrompt",
    ({ expectedIntent, rawPrompt }) => {
      const result = buildPromptFromText(rawPrompt);

      expect(result).not.toBeNull();
      expect(result!.brief.intent).toBe(expectedIntent);
    },
  );
});
