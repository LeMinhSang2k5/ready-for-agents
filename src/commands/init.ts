import pc from "picocolors";
import { generateAllFiles } from "../generators/index.js";
import {
  readProject,
  resolveProjectCwd,
  validateInitTarget,
} from "../fs/read-project.js";
import { planWriteActions, writeGeneratedFiles } from "../fs/write-files.js";
import type { GeneratedFiles } from "../types.js";
import { OUTPUT_FILES } from "../types.js";
import {
  formatCreatedLines,
  formatDetectedSummary,
  formatDryRunNotice,
  formatDryRunSeparator,
  formatOverwrittenLines,
  formatSkippedLines,
  formatWouldCreateLines,
  formatWouldOverwriteLines,
} from "./output.js";

export type InitOptions = {
  dryRun?: boolean;
  force?: boolean;
  cwd?: string;
};

/**
 * init command
 *   -> resolve cwd + validate
 *   -> read package.json
 *   -> detect package manager / stack / scripts / folders
 *   -> create ProjectContext
 *   -> generate markdown files
 *   -> if dry-run: print preview (no writes)
 *   -> else: write files safely (skip existing unless --force)
 */
export async function runInit(options: InitOptions): Promise<number> {
  const validationError = validateInitTarget(options.cwd);
  if (validationError) {
    console.error(pc.red(validationError));
    return 1;
  }

  const cwd = resolveProjectCwd(options.cwd);
  const ctx = readProject(cwd);
  const files = generateAllFiles(ctx);
  const force = options.force ?? false;

  printHeader();
  for (const line of formatDetectedSummary(ctx)) {
    console.log(line);
  }
  console.log();

  if (options.dryRun) {
    printDryRunPreview(cwd, files, force);
    console.log();
    console.log(pc.dim(formatDryRunSeparator()));
    console.log(pc.yellow(formatDryRunNotice()));
    return 0;
  }

  const { created, overwritten, skipped } = writeGeneratedFiles(
    ctx.cwd,
    files,
    {
      force,
    },
  );

  printResultLines(created, formatCreatedLines, pc.green);
  printResultLines(overwritten, formatOverwrittenLines, pc.magenta);
  printResultLines(skipped, formatSkippedLines, pc.yellow);

  if (
    created.length === 0 &&
    overwritten.length === 0 &&
    skipped.length === 0
  ) {
    console.log(pc.dim("No output files written."));
  }

  return 0;
}

function printResultLines(
  files: (typeof OUTPUT_FILES)[number][],
  formatter: (files: (typeof OUTPUT_FILES)[number][]) => string[],
  color: (text: string) => string,
): void {
  for (const line of formatter(files)) {
    console.log(color(line));
  }
}

function printHeader(): void {
  console.log(pc.bold("agent-context-kit"));
  console.log();
}

function printDryRunPreview(
  cwd: string,
  files: GeneratedFiles,
  force: boolean,
): void {
  const { wouldCreate, wouldOverwrite, wouldSkip } = planWriteActions(
    cwd,
    force,
  );

  printResultLines(wouldCreate, formatWouldCreateLines, pc.cyan);
  if (wouldCreate.length > 0) {
    console.log();
  }

  printResultLines(wouldOverwrite, formatWouldOverwriteLines, pc.magenta);
  if (wouldOverwrite.length > 0) {
    console.log();
  }

  printResultLines(wouldSkip, formatSkippedLines, pc.yellow);
  if (wouldSkip.length > 0) {
    console.log();
  }

  OUTPUT_FILES.forEach((name, index) => {
    console.log(
      pc.dim(`── ${name} ${"─".repeat(Math.max(0, 44 - name.length))}`),
    );
    console.log(files[name].trimEnd());
    if (index < OUTPUT_FILES.length - 1) {
      console.log();
    }
  });
}
