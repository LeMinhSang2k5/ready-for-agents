import type { PromptStats } from "./types.js";

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Rough token estimate (~4 chars per token for Latin scripts). */
export function estimateTokens(text: string): number {
  const chars = text.trim().length;
  if (chars === 0) return 0;
  return Math.max(1, Math.ceil(chars / 4));
}

export function computePromptStats(
  original: string,
  output: string,
): PromptStats {
  const originalChars = original.length;
  const outputChars = output.length;
  const charReductionPercent =
    originalChars === 0
      ? 0
      : Math.round(((originalChars - outputChars) / originalChars) * 100);

  return {
    originalChars,
    outputChars,
    charReductionPercent,
    originalWords: countWords(original),
    outputWords: countWords(output),
    estimatedTokens: estimateTokens(output),
  };
}

export function formatStatsLine(stats: PromptStats): string {
  const delta = stats.charReductionPercent;
  const label =
    delta > 0
      ? `${delta}% shorter`
      : delta < 0
        ? `${Math.abs(delta)}% longer`
        : "same length";
  return `chars ${stats.originalChars} → ${stats.outputChars} (${label}) · ~${stats.estimatedTokens ?? estimateTokens("")} tokens`;
}
