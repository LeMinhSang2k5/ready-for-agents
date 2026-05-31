import pc from "picocolors";
import { resolve } from "node:path";
import { runDoctorChecks } from "../doctor/checks.js";
import { formatScore, hasCriticalFailure } from "../doctor/score.js";
import type { DoctorCheck, DoctorResult } from "../doctor/checks.js";

export type DoctorOptions = {
  cwd?: string;
  json?: boolean;
};

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

  if (options.json) {
    console.log(JSON.stringify(formatDoctorJson(cwd, result, !hasFailure)));
    return hasFailure ? 1 : 0;
  }

  console.log(pc.bold("agent-context-kit doctor"));
  console.log();

  console.log("Checks:");
  for (const check of result.checks) {
    console.log(formatCheckLine(check));
  }

  console.log();
  console.log(pc.bold(formatScore(result)));

  return hasFailure ? 1 : 0;
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
