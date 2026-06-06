import type { PromptStyle, PromptTarget } from "../prompt/types.js";

export const CONFIG_FILE = ".ready-for-agents.json";
export const LEGACY_CONFIG_FILE = ".agent-context-kit.json";
export const INDEX_DIR = ".ready-for-agents";
export const INDEX_FILE = "context-tree.json";
export const DEFAULT_INDEX_OUTPUT = `${INDEX_DIR}/${INDEX_FILE}`;

export type ReadyForAgentsConfig = {
  $schema?: string;
  files?: {
    cursor?: boolean;
    claude?: boolean;
    copilot?: boolean;
    all?: boolean;
    index?: boolean;
  };
  doctor?: {
    fix?: {
      cursor?: boolean;
      claude?: boolean;
      copilot?: boolean;
      all?: boolean;
      force?: boolean;
      index?: boolean;
    };
  };
  prompt?: {
    target?: PromptTarget;
    context?: boolean;
    style?: PromptStyle;
    contextLimit?: number;
  };
  index?: {
    output?: string;
  };
};

export type ResolvedReadyForAgentsConfig = {
  sourcePath?: string;
  files: {
    cursor: boolean;
    claude: boolean;
    copilot: boolean;
    all: boolean;
    index: boolean;
  };
  doctor: {
    fix: {
      cursor: boolean;
      claude: boolean;
      copilot: boolean;
      all: boolean;
      force: boolean;
      index: boolean;
    };
  };
  prompt: {
    target: PromptTarget;
    context: boolean;
    style: PromptStyle;
    contextLimit: number;
  };
  index: {
    output: string;
  };
};

export const DEFAULT_CONFIG: ReadyForAgentsConfig = {
  $schema: "https://ready-for-agents.dev/config.schema.json",
  files: {
    cursor: false,
    claude: false,
    copilot: false,
    all: false,
    index: true,
  },
  doctor: {
    fix: {
      all: false,
      force: false,
      index: true,
    },
  },
  prompt: {
    target: "auto",
    context: false,
    style: "standard",
    contextLimit: 5,
  },
  index: {
    output: DEFAULT_INDEX_OUTPUT,
  },
};
