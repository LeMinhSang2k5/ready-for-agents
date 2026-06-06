import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runDoctor } from "../src/commands/doctor.js";
import { runDoctorChecks } from "../src/doctor/checks.js";
import { formatScore, hasCriticalFailure } from "../src/doctor/score.js";

const tempDirs: string[] = [];

function makeFixture(name: string, files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-doctor-${name}-`));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

function captureConsole() {
  const logs: string[] = [];
  vi.spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.map(String).join(" "));
  });
  return {
    output: () => logs.join("\n"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("runDoctorChecks", () => {
  it("returns all pass for a fully configured project", () => {
    const dir = makeFixture("full", {
      "package.json": JSON.stringify({
        name: "my-app",
        scripts: { dev: "vite", build: "tsc", test: "vitest" },
      }),
      "pnpm-lock.yaml": "",
      "AGENTS.md": "# Agents",
      "PROJECT_CONTEXT.md": "# Context",
      "COMMANDS.md": "# Commands",
      "README.md": "# Hello",
    });

    const result = runDoctorChecks(dir);

    expect(result.failed).toBe(0);
    expect(result.warned).toBe(0);
    expect(result.passed).toBe(result.total);
    expect(hasCriticalFailure(result)).toBe(false);
  });

  it("fails early when cwd does not exist", () => {
    const result = runDoctorChecks(
      join(tmpdir(), `missing-ready-for-agents-${randomUUID()}`),
    );

    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(hasCriticalFailure(result)).toBe(true);
    expect(result.checks[0]?.label).toBe("Project directory found");
    expect(result.checks[0]?.detail).toContain("does not exist");
  });

  it("fails early when cwd is not a directory", () => {
    const dir = makeFixture("not-dir", {
      "target.txt": "hello",
    });

    const result = runDoctorChecks(join(dir, "target.txt"));

    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(hasCriticalFailure(result)).toBe(true);
    expect(result.checks[0]?.label).toBe("Project directory is a directory");
    expect(result.checks[0]?.detail).toContain("is not a directory");
  });

  it("fails when package.json is missing", () => {
    const dir = makeFixture("no-pkg", {
      "README.md": "# Hi",
    });

    const result = runDoctorChecks(dir);

    expect(result.failed).toBeGreaterThan(0);
    expect(hasCriticalFailure(result)).toBe(true);

    const pkgCheck = result.checks.find(
      (c) => c.label === "package.json found",
    );
    expect(pkgCheck?.status).toBe("fail");
  });

  it("fails when package.json is invalid JSON", () => {
    const dir = makeFixture("bad-json", {
      "package.json": "{ invalid json }}}",
    });

    const result = runDoctorChecks(dir);

    expect(hasCriticalFailure(result)).toBe(true);
    const jsonCheck = result.checks.find(
      (c) => c.label === "package.json is valid JSON",
    );
    expect(jsonCheck?.status).toBe("fail");
  });

  it("warns when context files are missing", () => {
    const dir = makeFixture("no-context", {
      "package.json": JSON.stringify({
        name: "app",
        scripts: { dev: "vite", build: "tsc", test: "vitest" },
      }),
      "pnpm-lock.yaml": "",
      "README.md": "# Hi",
    });

    const result = runDoctorChecks(dir);

    expect(result.failed).toBe(0);
    expect(result.warned).toBe(3); // AGENTS.md, PROJECT_CONTEXT.md, COMMANDS.md
    expect(hasCriticalFailure(result)).toBe(false);

    const agentsCheck = result.checks.find(
      (c) => c.label === "AGENTS.md found",
    );
    expect(agentsCheck?.status).toBe("warn");
  });

  it("warns when scripts are missing", () => {
    const dir = makeFixture("no-scripts", {
      "package.json": JSON.stringify({ name: "app", scripts: {} }),
      "pnpm-lock.yaml": "",
      "AGENTS.md": "",
      "PROJECT_CONTEXT.md": "",
      "COMMANDS.md": "",
      "README.md": "",
    });

    const result = runDoctorChecks(dir);

    expect(result.failed).toBe(0);
    // dev, build, test scripts all missing = 3 warns
    const scriptWarns = result.checks.filter(
      (c) => c.status === "warn" && c.label.includes("script"),
    );
    expect(scriptWarns).toHaveLength(3);
    expect(hasCriticalFailure(result)).toBe(false);
  });

  it("warns when package manager falls back to npm", () => {
    const dir = makeFixture("no-lockfile", {
      "package.json": JSON.stringify({ name: "app", scripts: {} }),
      "AGENTS.md": "",
      "PROJECT_CONTEXT.md": "",
      "COMMANDS.md": "",
      "README.md": "",
    });

    const result = runDoctorChecks(dir);

    const pmCheck = result.checks.find((c) =>
      c.label.includes("Package manager"),
    );
    expect(pmCheck?.status).toBe("warn");
  });

  it("detects package manager from lockfile", () => {
    const dir = makeFixture("yarn-lock", {
      "package.json": JSON.stringify({ name: "app" }),
      "yarn.lock": "",
    });

    const result = runDoctorChecks(dir);

    const pmCheck = result.checks.find((c) =>
      c.label.includes("Package manager"),
    );
    expect(pmCheck?.status).toBe("pass");
    expect(pmCheck?.label).toContain("yarn");
  });
});

describe("formatScore", () => {
  it("formats score as passed/total", () => {
    const result = runDoctorChecks(
      makeFixture("score", {
        "package.json": JSON.stringify({
          name: "app",
          scripts: { dev: "vite", build: "tsc", test: "vitest" },
        }),
        "pnpm-lock.yaml": "",
        "README.md": "",
      }),
    );

    const score = formatScore(result);
    expect(score).toMatch(/^Score: \d+\/\d+ · \d+ warnings? · \d+ failures?$/);
  });
});

describe("hasCriticalFailure", () => {
  it("returns false when no fails", () => {
    const result = runDoctorChecks(
      makeFixture("no-fail", {
        "package.json": JSON.stringify({ name: "app" }),
        "pnpm-lock.yaml": "",
      }),
    );
    expect(hasCriticalFailure(result)).toBe(false);
  });

  it("returns true when package.json missing", () => {
    const dir = makeFixture("fail", {});
    expect(hasCriticalFailure(runDoctorChecks(dir))).toBe(true);
  });
});

describe("runDoctor --json", () => {
  it("prints machine-readable JSON without text header", async () => {
    const dir = makeFixture("json-ok", {
      "package.json": JSON.stringify({
        name: "app",
        scripts: { dev: "vite", build: "tsc", test: "vitest" },
      }),
      "pnpm-lock.yaml": "",
      "AGENTS.md": "",
      "PROJECT_CONTEXT.md": "",
      "COMMANDS.md": "",
      "README.md": "",
    });
    const { output } = captureConsole();

    const code = await runDoctor({ cwd: dir, json: true });
    const out = output();
    const parsed = JSON.parse(out) as {
      cwd: string;
      ok: boolean;
      score: { passed: number; warned: number; failed: number; total: number };
      checks: Array<{ label: string; status: string; detail?: string }>;
    };

    expect(code).toBe(0);
    expect(out).not.toContain("rfa doctor");
    expect(parsed.cwd).toBe(dir);
    expect(parsed.ok).toBe(true);
    expect(parsed.score.failed).toBe(0);
    expect(parsed.score.total).toBe(11);
    expect(parsed.checks[0]).toEqual({
      label: "Project directory found",
      status: "pass",
    });
  });

  it("returns exit 1 and ok false for critical failures", async () => {
    const missing = join(tmpdir(), `missing-ready-for-agents-${randomUUID()}`);
    const { output } = captureConsole();

    const code = await runDoctor({ cwd: missing, json: true });
    const parsed = JSON.parse(output()) as {
      ok: boolean;
      score: { failed: number; total: number };
      checks: Array<{ label: string; status: string; detail?: string }>;
    };

    expect(code).toBe(1);
    expect(parsed.ok).toBe(false);
    expect(parsed.score).toEqual({ passed: 0, warned: 0, failed: 1, total: 1 });
    expect(parsed.checks[0]?.label).toBe("Project directory found");
    expect(parsed.checks[0]?.detail).toContain("does not exist");
  });
});

describe("runDoctor --fix", () => {
  it("creates missing generated context files", async () => {
    const dir = makeFixture("fix-missing", {
      "package.json": JSON.stringify({
        name: "fix-app",
        scripts: { dev: "vite", build: "tsc", test: "vitest" },
      }),
      "pnpm-lock.yaml": "",
      "README.md": "# Hi",
    });

    const code = await runDoctor({ cwd: dir, fix: true });

    expect(code).toBe(0);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain(
      "ready-for-agents:generated",
    );
    expect(existsSync(join(dir, "PROJECT_CONTEXT.md"))).toBe(true);
    expect(existsSync(join(dir, "COMMANDS.md"))).toBe(true);
  });

  it("previews fixes without writing files in dry-run mode", async () => {
    const dir = makeFixture("fix-dry-run", {
      "package.json": JSON.stringify({
        name: "fix-app",
        scripts: { dev: "vite", build: "tsc", test: "vitest" },
      }),
      "pnpm-lock.yaml": "",
      "README.md": "# Hi",
    });
    const { output } = captureConsole();

    const code = await runDoctor({ cwd: dir, fix: true, dryRun: true });

    expect(code).toBe(0);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
    expect(output()).toContain("Fix preview:");
    expect(output()).toContain("Would generate:");
    expect(output()).toContain("Dry run");
  });

  it("skips untracked context files by default", async () => {
    const dir = makeFixture("fix-untracked", {
      "package.json": JSON.stringify({
        name: "fix-app",
        scripts: { dev: "vite", build: "tsc", test: "vitest" },
      }),
      "pnpm-lock.yaml": "",
      "README.md": "# Hi",
      "AGENTS.md": "USER_AUTHORED",
    });
    const { output } = captureConsole();

    const code = await runDoctor({ cwd: dir, fix: true });

    expect(code).toBe(1);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toBe("USER_AUTHORED");
    expect(existsSync(join(dir, "PROJECT_CONTEXT.md"))).toBe(true);
    expect(output()).toContain("Skipped untracked:");
  });

  it("prints combined machine-readable JSON", async () => {
    const dir = makeFixture("fix-json", {
      "package.json": JSON.stringify({
        name: "fix-app",
        scripts: { dev: "vite", build: "tsc", test: "vitest" },
      }),
      "pnpm-lock.yaml": "",
      "README.md": "# Hi",
    });
    const { output } = captureConsole();

    const code = await runDoctor({ cwd: dir, fix: true, json: true });
    const parsed = JSON.parse(output()) as {
      ok: boolean;
      fix: {
        ran: boolean;
        mode: string;
        ok: boolean;
        created: string[];
      };
    };

    expect(code).toBe(0);
    expect(parsed.ok).toBe(true);
    expect(parsed.fix).toMatchObject({
      ran: true,
      mode: "write",
      ok: true,
    });
    expect(parsed.fix.created).toContain("AGENTS.md");
    expect(output()).not.toContain("rfa doctor");
  });

  it("does not run fixes when doctor has a critical failure", async () => {
    const dir = makeFixture("fix-critical", {
      "README.md": "# Hi",
    });
    const { output } = captureConsole();

    const code = await runDoctor({ cwd: dir, fix: true });

    expect(code).toBe(1);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
    expect(output()).toContain("Fix skipped because doctor found a critical");
  });
});
