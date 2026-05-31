import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolvePackageManager } from "../detectors/package-manager.js";
import { parsePackageJsonRaw } from "../fs/validate.js";

export type DoctorCheckStatus = "pass" | "warn" | "fail";

export type DoctorCheck = {
  label: string;
  status: DoctorCheckStatus;
  detail?: string;
};

export type DoctorResult = {
  checks: DoctorCheck[];
  passed: number;
  warned: number;
  failed: number;
  total: number;
};

/**
 * Run all doctor checks against the given project directory.
 */
export function runDoctorChecks(cwd: string): DoctorResult {
  if (!existsSync(cwd)) {
    return summarize([
      {
        label: "Project directory found",
        status: "fail",
        detail: `${cwd} does not exist`,
      },
    ]);
  }

  const stat = statSync(cwd);
  if (!stat.isDirectory()) {
    return summarize([
      {
        label: "Project directory is a directory",
        status: "fail",
        detail: `${cwd} is not a directory`,
      },
    ]);
  }

  const checks: DoctorCheck[] = [
    { label: "Project directory found", status: "pass" },
  ];

  // package.json exists
  const packageJsonPath = join(cwd, "package.json");
  const hasPackageJson = existsSync(packageJsonPath);
  checks.push({
    label: "package.json found",
    status: hasPackageJson ? "pass" : "fail",
  });

  // 2. package.json is parseable
  let scripts: Record<string, string> = {};
  let packageManagerField: unknown;

  if (hasPackageJson) {
    try {
      const raw = readFileSync(packageJsonPath, "utf-8");
      const result = parsePackageJsonRaw(raw, packageJsonPath);
      if (result.ok) {
        checks.push({
          label: "package.json is valid JSON",
          status: "pass",
        });
        scripts =
          typeof result.data.scripts === "object" &&
          result.data.scripts !== null
            ? (result.data.scripts as Record<string, string>)
            : {};
        packageManagerField = result.data.packageManager;
      } else {
        checks.push({
          label: "package.json is valid JSON",
          status: "fail",
          detail: result.error.message,
        });
      }
    } catch {
      checks.push({
        label: "package.json is valid JSON",
        status: "fail",
        detail: "Cannot read package.json",
      });
    }
  } else {
    checks.push({
      label: "package.json is valid JSON",
      status: "fail",
      detail: "package.json not found",
    });
  }

  // 3. Package manager detected
  const { manager, source } = resolvePackageManager(cwd, packageManagerField);
  if (source !== "fallback") {
    checks.push({
      label: `Package manager detected: ${manager}`,
      status: "pass",
    });
  } else {
    checks.push({
      label: "Package manager detected",
      status: "warn",
      detail: `Falling back to ${manager}. Add a lockfile or "packageManager" field.`,
    });
  }

  // 4. AGENTS.md
  checks.push(fileExistsCheck(cwd, "AGENTS.md", "warn"));

  // 5. PROJECT_CONTEXT.md
  checks.push(fileExistsCheck(cwd, "PROJECT_CONTEXT.md", "warn"));

  // 6. COMMANDS.md
  checks.push(fileExistsCheck(cwd, "COMMANDS.md", "warn"));

  // 7. dev script
  checks.push(scriptExistsCheck(scripts, "dev"));

  // 8. build script
  checks.push(scriptExistsCheck(scripts, "build"));

  // 9. test script
  checks.push(scriptExistsCheck(scripts, "test"));

  // 10. README.md
  const hasReadme =
    existsSync(join(cwd, "README.md")) || existsSync(join(cwd, "README.MD"));
  checks.push({
    label: "README.md found",
    status: hasReadme ? "pass" : "warn",
  });

  return summarize(checks);
}

function fileExistsCheck(
  cwd: string,
  filename: string,
  missingStatus: DoctorCheckStatus,
): DoctorCheck {
  const exists = existsSync(join(cwd, filename));
  return {
    label: `${filename} found`,
    status: exists ? "pass" : missingStatus,
  };
}

function scriptExistsCheck(
  scripts: Record<string, string>,
  name: string,
): DoctorCheck {
  const has = name in scripts;
  return {
    label: has ? `${name} script found` : `${name} script not found`,
    status: has ? "pass" : "warn",
  };
}

function summarize(checks: DoctorCheck[]): DoctorResult {
  let passed = 0;
  let warned = 0;
  let failed = 0;

  for (const check of checks) {
    if (check.status === "pass") passed++;
    else if (check.status === "warn") warned++;
    else failed++;
  }

  return { checks, passed, warned, failed, total: checks.length };
}
