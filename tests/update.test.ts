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
import { runUpdate } from "../src/commands/update.js";
import {
  generateAllFiles,
  withGeneratedMarker,
} from "../src/generators/index.js";
import { readProject } from "../src/fs/read-project.js";

const tempDirs: string[] = [];

function writeFileWithParents(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function makeProject(name: string, extra: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-update-${name}-`));
  tempDirs.push(dir);
  const files = {
    "package.json": JSON.stringify({
      name: "update-app",
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

describe("runUpdate", () => {
  it("skips untracked existing core files by default", async () => {
    const dir = makeProject("core", {
      "AGENTS.md": "OLD_AGENTS",
      "PROJECT_CONTEXT.md": "OLD_CONTEXT",
      "COMMANDS.md": "OLD_COMMANDS",
    });

    const code = await runUpdate({ cwd: dir });

    expect(code).toBe(1);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toBe("OLD_AGENTS");
  });

  it("overwrites untracked core files with --force", async () => {
    const dir = makeProject("force", {
      "AGENTS.md": "OLD_AGENTS",
      "PROJECT_CONTEXT.md": "OLD_CONTEXT",
      "COMMANDS.md": "OLD_COMMANDS",
    });

    const code = await runUpdate({ cwd: dir, force: true });

    expect(code).toBe(0);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain(
      "## Project Goal",
    );
    expect(readFileSync(join(dir, "PROJECT_CONTEXT.md"), "utf-8")).toContain(
      "`update-app`",
    );
    expect(readFileSync(join(dir, "COMMANDS.md"), "utf-8")).toContain(
      "pnpm build",
    );
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain(
      "agent-context-kit:generated",
    );
  });

  it("skips generated files when the marker hash no longer matches the body", async () => {
    const dir = makeProject("edited-generated");
    const generated = generateAllFiles(readProject(dir));
    for (const [rel, content] of Object.entries(generated)) {
      writeFileWithParents(join(dir, rel), content);
    }
    const edited = withGeneratedMarker("AGENTS.md", "ORIGINAL\n").replace(
      "ORIGINAL",
      "USER_EDITED",
    );
    writeFileWithParents(join(dir, "AGENTS.md"), edited);

    const code = await runUpdate({ cwd: dir });

    expect(code).toBe(1);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toContain(
      "USER_EDITED",
    );
  });

  it("dry-run previews overwrite without writing files", async () => {
    const dir = makeProject("dry");
    const generated = generateAllFiles(readProject(dir));
    writeFileWithParents(join(dir, "AGENTS.md"), generated["AGENTS.md"]);
    writeFileWithParents(
      join(dir, "PROJECT_CONTEXT.md"),
      generated["PROJECT_CONTEXT.md"],
    );
    writeFileWithParents(join(dir, "COMMANDS.md"), generated["COMMANDS.md"]);
    writeFileWithParents(
      join(dir, "COMMANDS.md"),
      withGeneratedMarker("COMMANDS.md", "STALE\n"),
    );
    const { output } = captureConsole();

    const code = await runUpdate({ cwd: dir, dryRun: true });

    expect(code).toBe(0);
    expect(readFileSync(join(dir, "COMMANDS.md"), "utf-8")).toContain("STALE");
    expect(output()).toContain("Would overwrite:");
    expect(output()).toContain("- COMMANDS.md");
  });

  it("creates missing core files", async () => {
    const dir = makeProject("missing");

    const code = await runUpdate({ cwd: dir });

    expect(code).toBe(0);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "PROJECT_CONTEXT.md"))).toBe(true);
    expect(existsSync(join(dir, "COMMANDS.md"))).toBe(true);
  });

  it("--all refreshes optional Cursor and Claude files", async () => {
    const dir = makeProject("all", {
      ".cursor/rules/agent-context-kit.mdc": withGeneratedMarker(
        ".cursor/rules/agent-context-kit.mdc",
        "OLD_CURSOR\n",
      ),
      "CLAUDE.md": withGeneratedMarker("CLAUDE.md", "OLD_CLAUDE\n"),
    });

    const code = await runUpdate({ cwd: dir, all: true });

    expect(code).toBe(0);
    expect(
      readFileSync(join(dir, ".cursor/rules/agent-context-kit.mdc"), "utf-8"),
    ).toContain("alwaysApply: true");
    expect(readFileSync(join(dir, "CLAUDE.md"), "utf-8")).toContain(
      "# CLAUDE.md",
    );
  });

  it("--check returns 1 when selected files are missing", async () => {
    const dir = makeProject("check-missing");

    const code = await runUpdate({ cwd: dir, check: true });

    expect(code).toBe(1);
  });

  it("--check returns 0 when generated files are up to date", async () => {
    const dir = makeProject("check-ok");
    const generated = generateAllFiles(readProject(dir));
    for (const [rel, content] of Object.entries(generated)) {
      writeFileWithParents(join(dir, rel), content);
    }

    const code = await runUpdate({ cwd: dir, check: true });

    expect(code).toBe(0);
  });

  it("--check --json reports stale, missing, and untracked files", async () => {
    const dir = makeProject("check-json", {
      "AGENTS.md": "USER_AGENTS",
      "COMMANDS.md": withGeneratedMarker("COMMANDS.md", "STALE\n"),
    });
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    });

    const code = await runUpdate({ cwd: dir, check: true, json: true });

    expect(code).toBe(1);
    const parsed = JSON.parse(logs.join("\n")) as {
      ok: boolean;
      missing: string[];
      outdated: string[];
      untracked: string[];
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.missing).toContain("PROJECT_CONTEXT.md");
    expect(parsed.outdated).toContain("COMMANDS.md");
    expect(parsed.untracked).toContain("AGENTS.md");
  });
});
