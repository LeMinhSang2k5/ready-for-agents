const DOT_PLACEHOLDERS: Array<{
  pattern: RegExp;
  token: string;
  value: string;
}> = [
  { pattern: /package\.json/gi, token: "__PKG_JSON__", value: "package.json" },
  {
    pattern: /pnpm-lock\.yaml/gi,
    token: "__PNPM_LOCK__",
    value: "pnpm-lock.yaml",
  },
  { pattern: /yarn\.lock/gi, token: "__YARN_LOCK__", value: "yarn.lock" },
  {
    pattern: /package-lock\.json/gi,
    token: "__PKG_LOCK__",
    value: "package-lock.json",
  },
];

const COMMAND_PATTERN =
  /`([^`]+)`|\b(?:pnpm|npm|yarn|bun)\s+(?:run\s+)?[\w:./-]+(?:\s+--[\w-]+(?:[=\s][^\s]+)?)*|\bagent-context-kit\s+[\w:-]+(?:\s+--[\w-]+(?:[=\s][^\s]+)?)*|\bdoctor(?:\s+--[\w-]+(?:[=\s][^\s]+)?)+|\b(?:vitest|jest)\s+[\w:./-]+/gi;

function protectDottedTokens(text: string): {
  protectedText: string;
  restore: (value: string) => string;
} {
  let protectedText = text;
  for (const { pattern, token, value } of DOT_PLACEHOLDERS) {
    protectedText = protectedText.replace(pattern, () => token);
  }
  return {
    protectedText,
    restore: (value: string) => {
      let restored = value;
      for (const { token, value } of DOT_PLACEHOLDERS) {
        restored = restored.replaceAll(token, value);
      }
      return restored;
    },
  };
}

/** Split into sentences/clauses; preserves `package.json` and similar. */
export function segmentPromptText(text: string): string[] {
  const { protectedText, restore } = protectDottedTokens(text);
  return protectedText
    .split(/\n+|\.\s+|[!?;]+\s*/)
    .map((s) => restore(s.trim()))
    .filter((s) => s.length > 0);
}

export function extractCommands(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(COMMAND_PATTERN.source, COMMAND_PATTERN.flags);
  while ((match = re.exec(text)) !== null) {
    const cmd = (match[1] ?? match[0]).trim();
    if (cmd) found.add(cmd);
  }
  return [...found];
}
