import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { resolvePackageManager } from "../detectors/package-manager.js";
import { detectImportantFolders } from "../detectors/folders.js";
import { detectStack } from "../detectors/stack.js";
import type { ProjectContext } from "../types.js";
import {
  formatPackageJsonError,
  parsePackageJsonRaw,
  validateCwd,
  validatePackageJsonFile,
} from "./validate.js";

type PackageJson = {
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type ParsedPackageJson = {
  name: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  packageManagerField?: unknown;
};

export function resolveProjectCwd(cwd?: string): string {
  return resolve(cwd ?? process.cwd());
}

function readPackageJson(
  cwd: string,
): { ok: true; pkg: ParsedPackageJson } | { ok: false; error: string } {
  const missingError = validatePackageJsonFile(cwd);
  if (missingError) {
    return { ok: false, error: missingError };
  }

  const packageJsonPath = join(cwd, "package.json");
  const raw = readFileSync(packageJsonPath, "utf-8");
  const parsed = parsePackageJsonRaw(raw, packageJsonPath);

  if (!parsed.ok) {
    return { ok: false, error: formatPackageJsonError(parsed.error) };
  }

  const data = parsed.data as PackageJson;

  return {
    ok: true,
    pkg: {
      name: typeof data.name === "string" ? data.name : "unknown",
      scripts:
        typeof data.scripts === "object" && data.scripts !== null
          ? (data.scripts as Record<string, string>)
          : {},
      dependencies:
        typeof data.dependencies === "object" && data.dependencies !== null
          ? (data.dependencies as Record<string, string>)
          : {},
      devDependencies:
        typeof data.devDependencies === "object" &&
        data.devDependencies !== null
          ? (data.devDependencies as Record<string, string>)
          : {},
      packageManagerField: data.packageManager,
    },
  };
}

/**
 * Validate cwd + package.json before init. Call before readProject when using CLI.
 */
export function validateInitTarget(cwdInput?: string): string | null {
  const cwd = resolveProjectCwd(cwdInput);
  const cwdError = validateCwd(cwd);
  if (cwdError) {
    return cwdError;
  }

  const pkgResult = readPackageJson(cwd);
  if (!pkgResult.ok) {
    return pkgResult.error;
  }

  return null;
}

/**
 * init flow: resolve cwd → read package.json → detect pm/stack/scripts/folders → ProjectContext
 */
export function readProject(cwdInput?: string): ProjectContext {
  const cwd = resolveProjectCwd(cwdInput);
  const pkgResult = readPackageJson(cwd);

  if (!pkgResult.ok) {
    return emptyContext(cwd);
  }

  const { pkg } = pkgResult;
  const { manager, source } = resolvePackageManager(
    cwd,
    pkg.packageManagerField,
  );
  const stack = detectStack(pkg.dependencies, pkg.devDependencies);
  const folders = detectImportantFolders(cwd);

  return {
    cwd,
    name: pkg.name,
    packageManager: manager,
    packageManagerSource: source,
    stack,
    scripts: pkg.scripts,
    folders,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
  };
}

function emptyContext(cwd: string): ProjectContext {
  return {
    cwd,
    name: "unknown",
    packageManager: "npm",
    packageManagerSource: "fallback",
    stack: {},
    scripts: {},
    folders: [],
    dependencies: {},
    devDependencies: {},
  };
}

/** @deprecated Use validateInitTarget */
export function validateProjectForInit(ctx: ProjectContext): string | null {
  const cwdError = validateCwd(ctx.cwd);
  if (cwdError) {
    return cwdError;
  }
  return validatePackageJsonFile(ctx.cwd);
}

export function hasReadme(cwd: string): boolean {
  return (
    existsSync(join(cwd, "README.md")) || existsSync(join(cwd, "README.MD"))
  );
}
