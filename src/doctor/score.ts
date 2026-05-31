import type { DoctorResult } from "./checks.js";

/** Format the score line, e.g. "Score: 6/10 · 4 warnings · 0 failures" */
export function formatScore(result: DoctorResult): string {
  const warningLabel = result.warned === 1 ? "warning" : "warnings";
  const failureLabel = result.failed === 1 ? "failure" : "failures";
  return `Score: ${result.passed}/${result.total} · ${result.warned} ${warningLabel} · ${result.failed} ${failureLabel}`;
}

/**
 * Returns true if any check has "fail" status (exit code should be 1).
 */
export function hasCriticalFailure(result: DoctorResult): boolean {
  return result.failed > 0;
}
