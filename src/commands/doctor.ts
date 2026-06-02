import pc from "picocolors";
import { resolve } from "node:path";
import {
  checkGeneratedFiles,
  writeUpdateFiles,
  type UpdateWriteResult,
} from "./update.js";
import { runDoctorChecks } from "../doctor/checks.js";
import { formatScore, hasCriticalFailure } from "../doctor/score.js";
import { readProject } from "../fs/read-project.js";
import { generateAllFiles } from "../generators/index.js";
import type { DoctorCheck, DoctorResult } from "../doctor/checks.js";
import type { GeneratedFiles, GeneratePreset, OutputFile } from "../types.js";

export type DoctorOptions = {
  cwd?: string;
  json?: boolean;
  fix?: boolean;
  dryRun?: boolean;
  force?: boolean;
  cursor?: boolean;
  claude?: boolean;
  all?: boolean;
};

type DoctorFixJson =
  | {
      ran: false;
      ok: false;
      reason: "critical-failure";
    }
  | {
      ran: true;
      mode: "dry-run";
      ok: true;
      upToDate: OutputFile[];
      wouldGenerate: OutputFile[];
      wouldOverwrite: OutputFile[];
      wouldSkipUntracked: OutputFile[];
    }
  | ({
      ran: true;
      mode: "write";
      ok: boolean;
    } & UpdateWriteResult);

type DoctorFixResult = Exclude<DoctorFixJson, { ran: false }>;

/**
 * `agent-context-kit doctor` command handler.
 *
 * Runs all checks, prints results, and returns exit code:
 *   0 = no critical failures
 *   1 = at least one critical failure (e.g. missing or invalid package.json)
 */
export async function runDoctor(options: DoctorOptions): Promise<number> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const result = runDoctorChecks(cwd);
  const hasFailure = hasCriticalFailure(result);

  if (options.fix) {
    return runDoctorFix(cwd, result, hasFailure, options);
  }

  if (options.json) {
    console.log(JSON.stringify(formatDoctorJson(cwd, result, !hasFailure)));
    return hasFailure ? 1 : 0;
  }

  printDoctorReport(result);
  return hasFailure ? 1 : 0;
}

function runDoctorFix(
  cwd: string,
  result: DoctorResult,
  hasFailure: boolean,
  options: DoctorOptions,
): number {
  if (options.json) {
    const fix = hasFailure
      ? ({ ran: false, ok: false, reason: "critical-failure" } as const)
      : runFix(cwd, options);
    console.log(
      JSON.stringify({
        ...formatDoctorJson(cwd, result, !hasFailure && fix.ok),
        fix,
      }),
    );
    return !hasFailure && fix.ok ? 0 : 1;
  }

  printDoctorReport(result);

  if (hasFailure) {
    console.log();
    console.log(
      pc.yellow(
        "Fix skipped because doctor found a critical project problem. Resolve the failure above first.",
      ),
    );
    return 1;
  }

  const fix = runFix(cwd, options);
  printFixResult(fix);
  return fix.ok ? 0 : 1;
}

function printDoctorReport(result: DoctorResult): void {
  console.log(pc.bold("agent-context-kit doctor"));
  console.log();

  console.log("Checks:");
  for (const check of result.checks) {
    console.log(formatCheckLine(check));
  }

  console.log();
  console.log(pc.bold(formatScore(result)));
}

function formatDoctorJson(
  cwd: string,
  result: DoctorResult,
  ok: boolean,
): {
  cwd: string;
  ok: boolean;
  score: {
    passed: number;
    warned: number;
    failed: number;
    total: number;
  };
  checks: DoctorCheck[];
} {
  return {
    cwd,
    ok,
    score: {
      passed: result.passed,
      warned: result.warned,
      failed: result.failed,
      total: result.total,
    },
    checks: result.checks,
  };
}

function formatCheckLine(check: DoctorCheck): string {
  switch (check.status) {
    case "pass":
      return pc.green(`  ✓ ${check.label}`);
    case "warn": {
      const detail = check.detail ? pc.dim(` (${check.detail})`) : "";
      return pc.yellow(`  ! ${check.label}`) + detail;
    }
    case "fail": {
      const detail = check.detail ? pc.dim(` (${check.detail})`) : "";
      return pc.red(`  ✗ ${check.label}`) + detail;
    }
  }
}

function runFix(cwd: string, options: DoctorOptions): DoctorFixResult {
  const ctx = readProject(cwd);
  const files = generateAllFiles(ctx, resolveFixPresets(options));
  const check = checkGeneratedFiles(cwd, files);

  if (options.dryRun) {
    return {
      ran: true,
      mode: "dry-run",
      ok: true,
      upToDate: check.upToDate,
      wouldGenerate: check.missing,
      wouldOverwrite: check.outdated,
      wouldSkipUntracked: check.untracked,
    };
  }

  const selected = [
    ...check.missing,
    ...check.outdated,
    ...(options.force ? check.untracked : []),
  ];
  const filesToWrite = pickGeneratedFiles(files, selected);
  const writeResult =
    selected.length > 0
      ? writeUpdateFiles(cwd, filesToWrite, { force: options.force ?? false })
      : { created: [], overwritten: [], skippedUntracked: [] };
  const skippedUntracked = options.force ? [] : check.untracked;

  return {
    ran: true,
    mode: "write",
    ok: skippedUntracked.length === 0,
    created: writeResult.created,
    overwritten: writeResult.overwritten,
    skippedUntracked,
  };
}

function resolveFixPresets(options: DoctorOptions): GeneratePreset[] {
  const presets: GeneratePreset[] = ["core"];
  if (options.all || options.cursor) presets.push("cursor");
  if (options.all || options.claude) presets.push("claude");
  return presets;
}

function pickGeneratedFiles(
  files: GeneratedFiles,
  names: OutputFile[],
): GeneratedFiles {
  const picked: Partial<Record<OutputFile, string>> = {};
  for (const name of names) {
    if (files[name] !== undefined) {
      picked[name] = files[name];
    }
  }
  return picked as GeneratedFiles;
}

function printFixResult(fix: DoctorFixResult): void {
  console.log();
  console.log(pc.bold(fix.mode === "dry-run" ? "Fix preview:" : "Fix result:"));

  if (fix.mode === "dry-run") {
    printList("Would generate:", fix.wouldGenerate);
    printList("Would overwrite:", fix.wouldOverwrite);
    printList("Would skip untracked:", fix.wouldSkipUntracked);
    if (
      fix.wouldGenerate.length === 0 &&
      fix.wouldOverwrite.length === 0 &&
      fix.wouldSkipUntracked.length === 0
    ) {
      console.log(pc.green("No generated context files need fixing."));
    }
    console.log(pc.yellow("Dry run — no files written."));
    return;
  }

  printList("Generated:", fix.created);
  printList("Overwritten:", fix.overwritten);
  printList("Skipped untracked:", fix.skippedUntracked);
  if (
    fix.created.length === 0 &&
    fix.overwritten.length === 0 &&
    fix.skippedUntracked.length === 0
  ) {
    console.log(pc.green("No generated context files needed changes."));
  }
  if (fix.skippedUntracked.length > 0) {
    console.log(
      pc.yellow(
        "Some files were not generated by agent-context-kit. Re-run with `--force` to overwrite them.",
      ),
    );
  }
}

function printList(title: string, files: OutputFile[]): void {
  if (files.length === 0) return;
  console.log(title);
  for (const file of files) {
    console.log(`- ${file}`);
  }
  console.log();
}
