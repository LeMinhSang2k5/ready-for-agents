import { normalizePromptText } from "../prompt/normalize.js";
import { extractPromptBrief } from "../prompt/extract.js";
import { renderPromptBrief } from "../prompt/render.js";
import { readPromptInput } from "../prompt/input.js";
import { computePromptStats, formatStatsLine } from "../prompt/stats.js";
import type {
  PromptBrief,
  PromptOptions,
  PromptSource,
  PromptTarget,
} from "../prompt/types.js";

export type { PromptOptions };

const PROMPT_TARGETS = new Set<PromptTarget>(["auto", "en", "vi"]);

function normalizePromptTarget(target: PromptOptions["target"]): PromptTarget {
  if (target === undefined || target === "") return "auto";
  if (PROMPT_TARGETS.has(target as PromptTarget)) return target as PromptTarget;
  throw new Error("Invalid --target value. Use one of: auto, en, vi.");
}

/**
 * `agent-context-kit prompt` — structure rough instructions (no AI API).
 *
 * Exit 0 on success, 1 on empty input.
 */
export async function runPrompt(options: PromptOptions): Promise<number> {
  let target: PromptTarget;
  try {
    target = normalizePromptTarget(options.target);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  const inputResult = await readPromptInput(options);
  if (inputResult === null) {
    return 1;
  }
  if ("error" in inputResult) {
    console.error(inputResult.error);
    return 1;
  }

  const built = buildPromptFromText(
    inputResult.raw,
    inputResult.source,
    options.json ? "json" : "markdown",
    target,
  );
  if (!built) {
    return 1;
  }

  console.log(built.output);

  if (options.stats) {
    console.error(formatStatsLine(built.brief.stats));
  }

  return 0;
}

/** Pipeline helper for tests and programmatic use. */
export function buildPromptFromText(
  raw: string,
  source: PromptSource = "argument",
  format: "markdown" | "json" = "markdown",
  target: PromptTarget = "auto",
): { brief: PromptBrief; output: string } | null {
  const normalized = normalizePromptText(raw);
  if (!normalized) return null;

  const brief = extractPromptBrief(normalized, source, raw, target);
  const output = renderPromptBrief(brief, format);
  return {
    brief: { ...brief, stats: computePromptStats(raw, output) },
    output,
  };
}
