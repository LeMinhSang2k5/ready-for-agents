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
import { runInit } from "../src/commands/init.js";
import {
  formatDetectedSummary,
  formatDryRunSeparator,
  formatSkippedLines,
} from "../src/commands/output.js";
import { readProject } from "../src/fs/read-project.js";
import { isIgnoredDirectory } from "../src/fs/ignore.js";
import {
  getExistingOutputFiles,
  writeGeneratedFiles,
} from "../src/fs/write-files.js";
import { generateAllFiles } from "../src/generators/index.js";
import { IGNORED_SCAN_DIRS } from "../src/constants.js";
import { detectImportantFolders } from "../src/detectors/folders.js";

const tempDirs: string[] = [];

function writeFileWithParents(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
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

const DEFAULT_PACKAGE = {
  name: "my-app",
  scripts: {
    dev: "next dev",
    build: "next build",
    lint: "eslint .",
  },
  dependencies: { next: "15.0.0", react: "19.0.0" },
};

function makeProject(name: string, extra: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-init-${name}-`));
  tempDirs.push(dir);
  const base: Record<string, string> = {
    "package.json": JSON.stringify(DEFAULT_PACKAGE),
    "pnpm-lock.yaml": "",
    ...extra,
  };
  for (const [rel, content] of Object.entries(base)) {
    writeFileWithParents(join(dir, rel), content);
  }
  return dir;
}

function makeFullStackProject(
  name: string,
  extra: Record<string, string> = {},
): string {
  return makeProject(name, {
    "package.json": JSON.stringify({
      name: "fullstack-app",
      scripts: {
        dev: 'concurrently "npm run dev:client" "npm run dev:server"',
        "dev:client": "vite",
        "dev:server": "node server/index.js",
        build: "vite build",
      },
      dependencies: {
        react: "19.0.0",
        "react-dom": "19.0.0",
        express: "4.21.0",
        mongoose: "8.0.0",
      },
      devDependencies: {
        vite: "6.0.0",
      },
    }),
    "package-lock.json": "",
    "src/client.tsx": "export {}",
    ...extra,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("validation", () => {
  it("returns 1 when package.json is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ack-init-no-pkg-"));
    tempDirs.push(dir);

    const { output, errors } = captureConsole();
    const code = await runInit({ cwd: dir });

    expect(code).toBe(1);
    expect(errors()).toMatch(/package\.json/i);
    expect(output()).not.toContain("Detected:");
  });

  it("returns 1 for invalid package.json", async () => {
    const dir = makeProject("bad-json", {
      "package.json": "{ invalid json",
    });

    const { errors } = captureConsole();
    const code = await runInit({ cwd: dir });

    expect(code).toBe(1);
    expect(errors()).toMatch(/JSON parse error/i);
  });
});

describe("safe behavior", () => {
  it("creates nested paths in fixtures", () => {
    const dir = makeProject("nested", { "src/app/page.tsx": "export {}" });
    expect(existsSync(join(dir, "src/app/page.tsx"))).toBe(true);
  });

  it("does not overwrite existing files without --force", async () => {
    const dir = makeProject("no-force", { "AGENTS.md": "KEEP" });
    const code = await runInit({ cwd: dir });
    expect(code).toBe(0);
    expect(readFileSync(join(dir, "AGENTS.md"), "utf-8")).toBe("KEEP");
    expect(existsSync(join(dir, "PROJECT_CONTEXT.md"))).toBe(true);
  });

  it("overwrites with --force", async () => {
    const dir = makeProject("force", { "AGENTS.md": "OLD" });
    await runInit({ cwd: dir, force: true });
    const content = readFileSync(join(dir, "AGENTS.md"), "utf-8");
    expect(content).toContain("## Project Goal");
    expect(content).not.toBe("OLD");
  });

  it("--dry-run writes no files and prints preview output", async () => {
    const dir = makeProject("dry");
    const { output } = captureConsole();

    const code = await runInit({ cwd: dir, dryRun: true });

    expect(code).toBe(0);
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(dir, "PROJECT_CONTEXT.md"))).toBe(false);
    expect(existsSync(join(dir, "COMMANDS.md"))).toBe(false);

    const out = output();
    expect(out).toContain("Would generate:");
    expect(out).toContain("── AGENTS.md");
    expect(out).toContain(formatDryRunSeparator());
    expect(out).toContain("Dry run — no files written.");
  });

  it("--dry-run with optional agent files writes no nested files", async () => {
    const dir = makeProject("dry-optional");
    const { output } = captureConsole();

    const code = await runInit({
      cwd: dir,
      dryRun: true,
      cursor: true,
      claude: true,
    });

    expect(code).toBe(0);
    expect(existsSync(join(dir, ".cursor/rules/agent-context-kit.mdc"))).toBe(
      false,
    );
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(false);

    const out = output();
    expect(out).toContain(".cursor/rules/agent-context-kit.mdc");
    expect(out).toContain("CLAUDE.md");
  });

  it("generates optional Cursor and Claude files when requested", async () => {
    const dir = makeProject("optional");

    const code = await runInit({ cwd: dir, cursor: true, claude: true });

    expect(code).toBe(0);
    expect(
      readFileSync(join(dir, ".cursor/rules/agent-context-kit.mdc"), "utf-8"),
    ).toContain("alwaysApply: true");
    expect(readFileSync(join(dir, "CLAUDE.md"), "utf-8")).toContain(
      "# CLAUDE.md",
    );
  });

  it("--all generates all optional agent files", async () => {
    const dir = makeProject("all");

    const code = await runInit({ cwd: dir, all: true });

    expect(code).toBe(0);
    expect(existsSync(join(dir, ".cursor/rules/agent-context-kit.mdc"))).toBe(
      true,
    );
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
  });

  it("does not overwrite optional files without --force", async () => {
    const dir = makeProject("optional-no-force", {
      ".cursor/rules/agent-context-kit.mdc": "KEEP_CURSOR",
      "CLAUDE.md": "KEEP_CLAUDE",
    });

    const code = await runInit({ cwd: dir, cursor: true, claude: true });

    expect(code).toBe(0);
    expect(
      readFileSync(join(dir, ".cursor/rules/agent-context-kit.mdc"), "utf-8"),
    ).toBe("KEEP_CURSOR");
    expect(readFileSync(join(dir, "CLAUDE.md"), "utf-8")).toBe("KEEP_CLAUDE");
  });

  it("never treats ignored dirs as important folders", () => {
    for (const name of IGNORED_SCAN_DIRS) {
      expect(isIgnoredDirectory(name)).toBe(true);
    }
    const dir = makeProject("ignored");
    expect(detectImportantFolders(dir)).not.toContain("node_modules");
  });
});

describe("write result", () => {
  it("lists only pre-existing files as overwritten when --force", () => {
    const dir = makeProject("write-result", { "AGENTS.md": "old" });
    const ctx = readProject(dir);
    const files = generateAllFiles(ctx);

    const result = writeGeneratedFiles(dir, files, { force: true });

    expect(result.overwritten).toEqual(["AGENTS.md"]);
    expect(result.created).toContain("PROJECT_CONTEXT.md");
    expect(result.created).toContain("COMMANDS.md");
    expect(result.skipped).toHaveLength(0);
  });
});

describe("full-stack detection", () => {
  it("detects React/Vite + Express + Mongoose in terminal output", async () => {
    const dir = makeFullStackProject("fullstack");
    const { output } = captureConsole();

    await runInit({ cwd: dir, dryRun: true });

    const out = output();
    expect(out).toContain("Framework: React/Vite + Express");
    expect(out).toContain("Database: MongoDB/Mongoose");
    expect(out).toContain("Scripts: dev, dev:client, dev:server, build");
    expect(out).toContain("### Important Folders");
    expect(out).toContain("- `src/`");
  });
});

describe("terminal output format", () => {
  it("formats detected summary", () => {
    const dir = makeProject("fmt");
    const ctx = readProject(dir);
    const lines = formatDetectedSummary(ctx);
    expect(lines[0]).toBe("Detected:");
    expect(lines.join("\n")).toContain("Project: my-app");
    expect(lines.join("\n")).toContain("Package manager: pnpm");
    expect(lines.join("\n")).toContain("Framework: Next.js");
    expect(lines.join("\n")).not.toContain("Database:");
    expect(lines.join("\n")).toContain("Scripts: dev, build, lint");
  });

  it("formats skipped message", () => {
    const lines = formatSkippedLines(["AGENTS.md"]);
    expect(lines).toEqual([
      "Skipped:",
      "- AGENTS.md already exists. Use --force to overwrite.",
    ]);
  });

  it("prints Generated and Skipped separately", async () => {
    const dir = makeProject("log", { "AGENTS.md": "x" });
    const { output } = captureConsole();

    await runInit({ cwd: dir });

    const out = output();
    expect(out).toContain("agent-context-kit");
    expect(out).toContain("Detected:");
    expect(out).toContain("Generated:");
    expect(out).toContain("Skipped:");
    expect(out).not.toContain("Overwritten:");
    expect(out).toContain(
      "AGENTS.md already exists. Use --force to overwrite.",
    );
  });

  it("prints Overwritten only for files that already existed", async () => {
    const dir = makeProject("ow", { "AGENTS.md": "x" });
    const { output } = captureConsole();

    await runInit({ cwd: dir, force: true });

    const out = output();
    expect(out).toContain("Overwritten:");
    expect(out).toContain("- AGENTS.md");
    expect(out).not.toMatch(/Overwritten:[\s\S]*- PROJECT_CONTEXT\.md/);
    expect(out).not.toMatch(/Overwritten:[\s\S]*- COMMANDS\.md/);
    expect(out).toContain("Generated:");
    expect(out).toContain("- PROJECT_CONTEXT.md");
    expect(out).toContain("- COMMANDS.md");
  });
});

describe("getExistingOutputFiles", () => {
  it("lists only existing output files", () => {
    const dir = makeProject("exist", { "COMMANDS.md": "# x" });
    expect(getExistingOutputFiles(dir)).toEqual(["COMMANDS.md"]);
  });
});
