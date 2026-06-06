import { normalizePromptText } from "../prompt/normalize.js";
import { extractPromptBrief } from "../prompt/extract.js";
import { renderPromptBrief } from "../prompt/render.js";
import { readPromptInput } from "../prompt/input.js";
import { computePromptStats, formatStatsLine } from "../prompt/stats.js";
import { readReadyForAgentsConfig } from "../config/read.js";
import { lookupPromptContext } from "../prompt/context.js";
import type {
  PromptBrief,
  PromptOptions,
  PromptSource,
  PromptStyle,
  PromptTarget,
} from "../prompt/types.js";

export type { PromptOptions };

const PROMPT_TARGETS = new Set<PromptTarget>(["auto", "en", "vi"]);
const PROMPT_STYLES = new Set<PromptStyle>(["standard", "compact"]);

function normalizePromptTarget(target: PromptOptions["target"]): PromptTarget {
  if (target === undefined || target === "") return "auto";
  if (PROMPT_TARGETS.has(target as PromptTarget)) return target as PromptTarget;
  throw new Error("Invalid --target value. Use one of: auto, en, vi.");
}

function normalizePromptStyle(style: PromptOptions["style"]): PromptStyle {
  if (style === undefined || style === "") return "standard";
  if (PROMPT_STYLES.has(style as PromptStyle)) return style as PromptStyle;
  throw new Error("Invalid prompt style. Use one of: standard, compact.");
}

/**
 * `rfa prompt` — structure rough instructions (no AI API).
 *
 * Exit 0 on success, 1 on empty input.
 */
export async function runPrompt(options: PromptOptions): Promise<number> {
  const configResult = readReadyForAgentsConfig(options.cwd ?? process.cwd());
  if (!configResult.ok) {
    console.error(configResult.error);
    return 1;
  }

  let target: PromptTarget;
  let style: PromptStyle;
  try {
    target = normalizePromptTarget(
      options.target ?? configResult.config.prompt.target,
    );
    style = normalizePromptStyle(
      options.style ??
        (options.compact ? "compact" : configResult.config.prompt.style),
    );
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
    { style },
  );
  if (!built) {
    return 1;
  }

  const includeContext = options.context ?? configResult.config.prompt.context;
  const contextLimit = parseContextLimit(
    options.contextLimit ?? configResult.config.prompt.contextLimit,
  );
  const finalBuilt = includeContext
    ? withPromptContext(built.brief, inputResult.raw, {
        cwd: options.cwd,
        format: options.json ? "json" : "markdown",
        contextLimit,
      })
    : { ok: true as const, ...built };

  if (!finalBuilt.ok) {
    console.error(finalBuilt.error);
    return 1;
  }

  console.log(finalBuilt.output);

  if (options.stats) {
    console.error(formatStatsLine(finalBuilt.brief.stats));
  }

  return 0;
}

/** Pipeline helper for tests and programmatic use. */
export function buildPromptFromText(
  raw: string,
  source: PromptSource = "argument",
  format: "markdown" | "json" = "markdown",
  target: PromptTarget = "auto",
  options: { style?: PromptStyle } = {},
): { brief: PromptBrief; output: string } | null {
  const normalized = normalizePromptText(raw);
  if (!normalized) return null;

  const brief = {
    ...extractPromptBrief(normalized, source, raw, target),
    style: options.style ?? "standard",
  };
  const output = renderPromptBrief(brief, format);
  return {
    brief: { ...brief, stats: computePromptStats(raw, output) },
    output,
  };
}

function withPromptContext(
  brief: PromptBrief,
  raw: string,
  options: {
    cwd?: string;
    format: "markdown" | "json";
    contextLimit: number;
  },
):
  | { ok: true; brief: PromptBrief; output: string }
  | { ok: false; error: string } {
  const contextResult = lookupPromptContext(
    options.cwd,
    `${brief.task}\n${brief.original}`,
    options.contextLimit,
  );
  if (!contextResult.ok) {
    return {
      ok: false,
      error: `Cannot load prompt context: ${contextResult.error}`,
    };
  }

  const nextBrief: PromptBrief = {
    ...brief,
    relevantContext: contextResult.references,
    contextSource: contextResult.source,
    contextTreePath: contextResult.treePath,
  };
  const output = renderPromptBrief(nextBrief, options.format);
  return {
    ok: true,
    brief: {
      ...nextBrief,
      stats: computePromptStats(raw, output),
    },
    output,
  };
}

function parseContextLimit(value: number | string | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(20, Math.max(1, Math.floor(value)));
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.min(20, Math.max(1, parsed));
    }
  }
  return 5;
}
