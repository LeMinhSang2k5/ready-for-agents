import type {
  PackageManager,
  PackageManagerSource,
  ProjectStack,
} from "../types.js";
import {
  isStackEmpty,
  stackDatabaseSummary,
  stackFrameworkSummary,
} from "./stack.js";

export function packageManagerLabel(
  pm: PackageManager,
  source?: PackageManagerSource,
): string {
  const base = pm;
  if (!source || source === "lockfile") {
    return base;
  }
  if (source === "package.json") {
    return `${base} (from package.json)`;
  }
  return `${base} (fallback)`;
}

export function stackFrameworkDisplay(stack: ProjectStack): string {
  if (isStackEmpty(stack)) {
    return "Not detected";
  }
  return stackFrameworkSummary(stack);
}

export function stackDatabaseDisplay(stack: ProjectStack): string {
  return stackDatabaseSummary(stack) ?? "Not detected";
}
