import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ReadyForAgentsConfig,
  ResolvedReadyForAgentsConfig,
} from "./types.js";
import {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  DEFAULT_INDEX_OUTPUT,
  LEGACY_CONFIG_FILE,
} from "./types.js";
import type { PromptStyle, PromptTarget } from "../prompt/types.js";

const PROMPT_TARGETS = new Set<PromptTarget>(["auto", "en", "vi"]);
const PROMPT_STYLES = new Set<PromptStyle>(["standard", "compact"]);

export type ConfigReadResult =
  | {
      ok: true;
      config: ResolvedReadyForAgentsConfig;
      raw?: ReadyForAgentsConfig;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

export function readReadyForAgentsConfig(cwd: string): ConfigReadResult {
  const configPath = resolveConfigPath(cwd);
  if (!configPath) {
    return {
      ok: true,
      config: resolveConfig(undefined),
      warnings: [],
    };
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return {
        ok: false,
        error: `Invalid config file: ${configPath} must contain a JSON object.`,
      };
    }
    const parsed = raw as ReadyForAgentsConfig;
    const { config, warnings } = normalizeConfig(parsed, configPath);
    return {
      ok: true,
      config,
      raw: parsed,
      warnings,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Cannot read config file: ${configPath}. ${detail}`,
    };
  }
}

export function resolveConfigPath(cwd: string): string | undefined {
  const primary = join(cwd, CONFIG_FILE);
  if (existsSync(primary)) return primary;

  const legacy = join(cwd, LEGACY_CONFIG_FILE);
  if (existsSync(legacy)) return legacy;

  return undefined;
}

export function stringifyDefaultConfig(): string {
  return `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`;
}

function normalizeConfig(
  raw: ReadyForAgentsConfig,
  sourcePath: string,
): { config: ResolvedReadyForAgentsConfig; warnings: string[] } {
  const warnings: string[] = [];
  const config = resolveConfig(raw);
  config.sourcePath = sourcePath;

  if (raw.prompt?.target && !PROMPT_TARGETS.has(raw.prompt.target)) {
    warnings.push(
      `Ignoring invalid prompt.target in ${sourcePath}: ${String(
        raw.prompt.target,
      )}`,
    );
    config.prompt.target = "auto";
  }
  if (raw.prompt?.style && !PROMPT_STYLES.has(raw.prompt.style)) {
    warnings.push(
      `Ignoring invalid prompt.style in ${sourcePath}: ${String(
        raw.prompt.style,
      )}`,
    );
    config.prompt.style = "standard";
  }

  return { config, warnings };
}

function resolveConfig(
  raw: ReadyForAgentsConfig | undefined,
): ResolvedReadyForAgentsConfig {
  return {
    files: {
      cursor: readBoolean(raw?.files?.cursor, false),
      claude: readBoolean(raw?.files?.claude, false),
      copilot: readBoolean(raw?.files?.copilot, false),
      all: readBoolean(raw?.files?.all, false),
      index: readBoolean(raw?.files?.index, true),
    },
    doctor: {
      fix: {
        cursor: readBoolean(raw?.doctor?.fix?.cursor, false),
        claude: readBoolean(raw?.doctor?.fix?.claude, false),
        copilot: readBoolean(raw?.doctor?.fix?.copilot, false),
        all: readBoolean(raw?.doctor?.fix?.all, false),
        force: readBoolean(raw?.doctor?.fix?.force, false),
        index: readBoolean(raw?.doctor?.fix?.index, true),
      },
    },
    prompt: {
      target: PROMPT_TARGETS.has(raw?.prompt?.target as PromptTarget)
        ? (raw?.prompt?.target as PromptTarget)
        : "auto",
      context: readBoolean(raw?.prompt?.context, false),
      style: PROMPT_STYLES.has(raw?.prompt?.style as PromptStyle)
        ? (raw?.prompt?.style as PromptStyle)
        : "standard",
      contextLimit: readNumber(raw?.prompt?.contextLimit, 5, 1, 20),
    },
    index: {
      output:
        typeof raw?.index?.output === "string" && raw.index.output.trim() !== ""
          ? raw.index.output
          : DEFAULT_INDEX_OUTPUT,
    },
  };
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}
