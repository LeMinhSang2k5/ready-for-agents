import { existsSync } from "node:fs";
import { join } from "node:path";
import type { PackageManager, PackageManagerSource } from "../types.js";

const LOCKFILES: { file: string; manager: PackageManager }[] = [
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" },
  { file: "bun.lockb", manager: "bun" },
  { file: "bun.lock", manager: "bun" },
  { file: "package-lock.json", manager: "npm" },
];

export function detectPackageManagerFromLockfile(
  cwd: string,
): PackageManager | undefined {
  for (const { file, manager } of LOCKFILES) {
    if (existsSync(join(cwd, file))) {
      return manager;
    }
  }
  return undefined;
}

/** Parse `packageManager` field e.g. "pnpm@9.0.0" or "yarn@berry". */
export function parsePackageManagerField(
  value: unknown,
): PackageManager | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const name = value.split("@")[0]?.trim().toLowerCase();
  if (name === "npm" || name === "pnpm" || name === "yarn" || name === "bun") {
    return name;
  }
  return undefined;
}

export type ResolvedPackageManager = {
  manager: PackageManager;
  source: PackageManagerSource;
};

/**
 * Priority: lockfile → package.json `packageManager` → npm fallback
 */
export function resolvePackageManager(
  cwd: string,
  packageManagerField?: unknown,
): ResolvedPackageManager {
  const fromLockfile = detectPackageManagerFromLockfile(cwd);
  if (fromLockfile) {
    return { manager: fromLockfile, source: "lockfile" };
  }

  const fromField = parsePackageManagerField(packageManagerField);
  if (fromField) {
    return { manager: fromField, source: "package.json" };
  }

  return { manager: "npm", source: "fallback" };
}

/** @deprecated Use detectPackageManagerFromLockfile */
export function detectPackageManager(cwd: string): PackageManager | undefined {
  return detectPackageManagerFromLockfile(cwd);
}
