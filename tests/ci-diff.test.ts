import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCi } from "../src/commands/ci.js";
import { runDiff } from "../src/commands/diff.js";
import { runInit } from "../src/commands/init.js";
import { withGeneratedMarker } from "../src/generators/index.js";

const tempDirs: string[] = [];

function writeFileWithParents(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function makeProject(name: string, extra: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-ci-diff-${name}-`));
  tempDirs.push(dir);
  const files = {
    "package.json": JSON.stringify({
      name: "ci-diff-app",
      scripts: {
        build: "vite build",
        test: "vitest run",
      },
      dependencies: {
        react: "18.0.0",
        vite: "5.0.0",
      },
    }),
    "pnpm-lock.yaml": "",
    ...extra,
  };

  for (const [rel, content] of Object.entries(files)) {
    writeFileWithParents(join(dir, rel), content);
  }

  return dir;
}

function captureConsole() {
  const logs: string[] = [];
  const errors: string[] = [];
  vi.spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args.map(String).join(" "));
  });
  return {
    output: () => logs.join("\n"),
    errors: () => errors.join("\n"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("runCi", () => {
  it("previews the GitHub Actions workflow without writing", async () => {
    const dir = makeProject("ci-dry");
    const { output } = captureConsole();

    const code = await runCi({ cwd: dir, dryRun: true });

    expect(code).toBe(0);
    expect(
      existsSync(join(dir, ".github/workflows/ready-for-agents.yml")),
    ).toBe(false);
    expect(output()).toContain("rfa ci");
    expect(output()).toContain("Would generate:");
    expect(output()).toContain("rfa diff --json --cwd .");
    expect(output()).toContain("Dry run");
  });

  it("writes a marked workflow and preserves existing files unless forced", async () => {
    const dir = makeProject("ci-write");
    const target = join(dir, ".github/workflows/ready-for-agents.yml");

    expect(await runCi({ cwd: dir })).toBe(0);
    const generated = readFileSync(target, "utf-8");
    expect(generated).toContain("name: ready-for-agents");
    expect(generated).toContain(
      '# ready-for-agents:generated file=".github/workflows/ready-for-agents.yml"',
    );

    writeFileWithParents(target, "KEEP\n");
    expect(await runCi({ cwd: dir })).toBe(0);
    expect(readFileSync(target, "utf-8")).toBe("KEEP\n");

    expect(await runCi({ cwd: dir, force: true })).toBe(0);
    expect(readFileSync(target, "utf-8")).toContain("rfa doctor --json");
  });
});

describe("runDiff", () => {
  it("returns 0 when generated context is current", async () => {
    const dir = makeProject("diff-current");
    await runInit({ cwd: dir, index: false });
    const { output } = captureConsole();

    const code = await runDiff({ cwd: dir });

    expect(code).toBe(0);
    expect(output()).toContain("rfa diff");
    expect(output()).toContain("All selected generated context files");
  });

  it("prints a diff for stale generated files", async () => {
    const dir = makeProject("diff-stale");
    await runInit({ cwd: dir, index: false });
    writeFileWithParents(
      join(dir, "COMMANDS.md"),
      withGeneratedMarker("COMMANDS.md", "# COMMANDS.md\n\nSTALE\n"),
    );
    const { output } = captureConsole();

    const code = await runDiff({ cwd: dir });

    expect(code).toBe(1);
    expect(output()).toContain("Outdated:");
    expect(output()).toContain("- COMMANDS.md");
    expect(output()).toContain("diff -- COMMANDS.md");
    expect(output()).toContain("-STALE");
    expect(output()).toContain("+Common commands for");
  });

  it("prints machine-readable JSON for missing files", async () => {
    const dir = makeProject("diff-json");
    const { output } = captureConsole();

    const code = await runDiff({ cwd: dir, json: true });
    const parsed = JSON.parse(output()) as {
      ok: boolean;
      missing: string[];
      diffs: Array<{ file: string; diff: string }>;
    };

    expect(code).toBe(1);
    expect(parsed.ok).toBe(false);
    expect(parsed.missing).toContain("AGENTS.md");
    expect(parsed.diffs).toEqual([]);
  });
});
