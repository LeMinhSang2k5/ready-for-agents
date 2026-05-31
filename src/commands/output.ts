import {
  packageManagerLabel,
  stackDatabaseDisplay,
  stackFrameworkDisplay,
} from "../detectors/labels.js";
import { formatScriptListForTerminal } from "../detectors/scripts.js";
import type { OutputFile, ProjectContext } from "../types.js";

export function formatDetectedSummary(ctx: ProjectContext): string[] {
  const lines = [
    "Detected:",
    `- Project: ${ctx.name}`,
    `- Package manager: ${packageManagerLabel(ctx.packageManager, ctx.packageManagerSource)}`,
    `- Framework: ${stackFrameworkDisplay(ctx.stack)}`,
  ];

  if (ctx.stack.database) {
    lines.push(`- Database: ${stackDatabaseDisplay(ctx.stack)}`);
  }

  lines.push(`- Scripts: ${formatScriptListForTerminal(ctx.scripts)}`);

  return lines;
}

export function formatCreatedLines(files: OutputFile[]): string[] {
  if (files.length === 0) {
    return [];
  }
  return ["Generated:", ...files.map((f) => `- ${f}`)];
}

export function formatOverwrittenLines(files: OutputFile[]): string[] {
  if (files.length === 0) {
    return [];
  }
  return ["Overwritten:", ...files.map((f) => `- ${f}`)];
}

export function formatSkippedLines(files: OutputFile[]): string[] {
  if (files.length === 0) {
    return [];
  }
  return [
    "Skipped:",
    ...files.map((f) => `- ${f} already exists. Use --force to overwrite.`),
  ];
}

export function formatWouldCreateLines(files: OutputFile[]): string[] {
  if (files.length === 0) {
    return [];
  }
  return ["Would generate:", ...files.map((f) => `- ${f}`)];
}

export function formatWouldOverwriteLines(files: OutputFile[]): string[] {
  if (files.length === 0) {
    return [];
  }
  return ["Would overwrite:", ...files.map((f) => `- ${f}`)];
}

export const DRY_RUN_SEPARATOR = "─".repeat(46);

export function formatDryRunSeparator(): string {
  return DRY_RUN_SEPARATOR;
}

export function formatDryRunNotice(): string {
  return "Dry run — no files written.";
}

/** @deprecated Use formatCreatedLines */
export function formatGeneratedLines(files: OutputFile[]): string[] {
  return formatCreatedLines(files);
}
