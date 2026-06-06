import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export type PackageJsonReadError =
  | { code: "MISSING"; message: string }
  | { code: "INVALID_JSON"; message: string }
  | { code: "NOT_OBJECT"; message: string };

export function validateCwd(cwd: string): string | null {
  if (!existsSync(cwd)) {
    return `Directory does not exist: ${cwd}`;
  }

  try {
    if (!statSync(cwd).isDirectory()) {
      return `Not a directory: ${cwd}`;
    }
  } catch {
    return `Cannot read directory: ${cwd}`;
  }

  return null;
}

export function validatePackageJsonFile(cwd: string): string | null {
  const packageJsonPath = join(cwd, "package.json");

  if (!existsSync(packageJsonPath)) {
    return `No package.json found at ${packageJsonPath}. rfa init requires a Node.js project.`;
  }

  try {
    if (!statSync(packageJsonPath).isFile()) {
      return `package.json is not a file: ${packageJsonPath}`;
    }
  } catch {
    return `Cannot read package.json: ${packageJsonPath}`;
  }

  return null;
}

export function parsePackageJsonRaw(
  raw: string,
  packageJsonPath: string,
):
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: PackageJsonReadError } {
  try {
    const data = JSON.parse(raw) as unknown;
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return {
        ok: false,
        error: {
          code: "NOT_OBJECT",
          message: `Invalid package.json (expected an object): ${packageJsonPath}`,
        },
      };
    }
    return { ok: true, data: data as Record<string, unknown> };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: {
        code: "INVALID_JSON",
        message: `Invalid package.json (JSON parse error): ${packageJsonPath}\n  ${detail}`,
      },
    };
  }
}

export function formatPackageJsonError(error: PackageJsonReadError): string {
  return error.message;
}
