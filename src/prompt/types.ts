export type PromptSource = "argument" | "stdin" | "file" | "interactive";
export type PromptTarget = "auto" | "en" | "vi";

/** MVP intents; `compare`, `plan`, `implement` reserved for later. */
export type PromptIntent =
  | "explain"
  | "review"
  | "fix"
  | "verify"
  | "clarify"
  | "general";

export type PromptStats = {
  originalChars: number;
  outputChars: number;
  charReductionPercent: number;
  originalWords?: number;
  outputWords?: number;
  estimatedTokens?: number;
};

export type PromptBrief = {
  source: PromptSource;
  target: PromptTarget;
  original: string;
  intent: PromptIntent;
  task: string;
  context: string[];
  requirements: string[];
  constraints: string[];
  verify: string[];
  unclear: string[];
  response: string[];
  stats: PromptStats;
};

export type PromptOptions = {
  text?: string;
  stdin?: boolean;
  file?: string;
  target?: PromptTarget | string;
  json?: boolean;
  stats?: boolean;
};

export type PromptJsonOutput = {
  target: PromptTarget;
  intent: PromptIntent;
  task: string;
  context: string[];
  requirements: string[];
  constraints: string[];
  verify: string[];
  unclear: string[];
  response: string[];
};

export type PromptRenderFormat = "markdown" | "json";
