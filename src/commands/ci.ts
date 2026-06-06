import pc from "picocolors";
import { resolve } from "node:path";
import { validateCwd } from "../fs/validate.js";
import { planWriteActions, writeGeneratedFiles } from "../fs/write-files.js";
import { generateCiWorkflowFile } from "../generators/index.js";
import type { GeneratedFileMap, OutputFile } from "../types.js";
import {
  formatCreatedLines,
  formatDryRunNotice,
  formatDryRunSeparator,
  formatOverwrittenLines,
  formatSkippedLines,
  formatWouldCreateLines,
  formatWouldOverwriteLines,
} from "./output.js";

export type CiOptions = {
  cwd?: string;
  dryRun?: boolean;
  force?: boolean;
};

export async function runCi(options: CiOptions): Promise<number> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const validationError = validateCwd(cwd);
  if (validationError) {
    console.error(pc.red(validationError));
    return 1;
  }

  const files = generateCiWorkflowFile();
  const force = options.force ?? false;

  console.log(pc.bold("rfa ci"));
  console.log();

  if (options.dryRun) {
    printDryRunPreview(cwd, files, force);
    console.log();
    console.log(pc.dim(formatDryRunSeparator()));
    console.log(pc.yellow(formatDryRunNotice()));
    return 0;
  }

  const result = writeGeneratedFiles(cwd, files, { force });
  printResultLines(result.created, formatCreatedLines, pc.green);
  printResultLines(result.overwritten, formatOverwrittenLines, pc.magenta);
  printResultLines(result.skipped, formatSkippedLines, pc.yellow);

  if (
    result.created.length === 0 &&
    result.overwritten.length === 0 &&
    result.skipped.length === 0
  ) {
    console.log(pc.dim("No workflow file written."));
  }

  return 0;
}

function printDryRunPreview(
  cwd: string,
  files: GeneratedFileMap,
  force: boolean,
): void {
  const { wouldCreate, wouldOverwrite, wouldSkip } = planWriteActions(
    cwd,
    force,
    files,
  );

  printResultLines(wouldCreate, formatWouldCreateLines, pc.cyan);
  if (wouldCreate.length > 0) console.log();

  printResultLines(wouldOverwrite, formatWouldOverwriteLines, pc.magenta);
  if (wouldOverwrite.length > 0) console.log();

  printResultLines(wouldSkip, formatSkippedLines, pc.yellow);
  if (wouldSkip.length > 0) console.log();

  for (const [name, content] of Object.entries(files) as [
    OutputFile,
    string,
  ][]) {
    console.log(
      pc.dim(`── ${name} ${"─".repeat(Math.max(0, 44 - name.length))}`),
    );
    console.log(content.trimEnd());
  }
}

function printResultLines(
  files: OutputFile[],
  formatter: (files: OutputFile[]) => string[],
  color: (text: string) => string,
): void {
  for (const line of formatter(files)) {
    console.log(color(line));
  }
}
