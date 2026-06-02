export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export type PackageManagerSource = "lockfile" | "package.json" | "fallback";

/** One detected stack layer with dependency evidence. */
export type StackLayer = {
  label: string;
  source: string[];
};

/** Detected layers from dependencies (human-readable labels). */
export type ProjectStack = {
  frontend?: StackLayer;
  backend?: StackLayer;
  database?: StackLayer;
};

/** Common script keys used for detection output and COMMANDS.md sections. */
export type ScriptKey =
  | "dev"
  | "build"
  | "test"
  | "lint"
  | "typecheck"
  | "format";

export const SCRIPT_KEYS: ScriptKey[] = [
  "dev",
  "build",
  "test",
  "lint",
  "typecheck",
  "format",
];

export const IMPORTANT_FOLDERS = [
  "src",
  "app",
  "pages",
  "components",
  "lib",
  "tests",
] as const;

export type ImportantFolder = (typeof IMPORTANT_FOLDERS)[number];

export type ProjectContext = {
  cwd: string;
  name: string;
  packageManager: PackageManager;
  packageManagerSource: PackageManagerSource;
  stack: ProjectStack;
  scripts: Record<string, string>;
  folders: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export const OUTPUT_FILES = [
  "AGENTS.md",
  "PROJECT_CONTEXT.md",
  "COMMANDS.md",
  ".cursor/rules/agent-context-kit.mdc",
  "CLAUDE.md",
] as const;

export type OutputFile = (typeof OUTPUT_FILES)[number];

export type GeneratedFiles = Partial<Record<OutputFile, string>> &
  Record<"AGENTS.md" | "PROJECT_CONTEXT.md" | "COMMANDS.md", string>;

export type GeneratePreset = "core" | "cursor" | "claude";
