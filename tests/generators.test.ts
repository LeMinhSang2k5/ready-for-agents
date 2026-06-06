import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { readProject } from "../src/fs/read-project.js";
import {
  generateAllFiles,
  generateCiWorkflowFile,
} from "../src/generators/index.js";
import type { OutputFile } from "../src/types.js";

const tempDirs: string[] = [];

function writeFileWithParents(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function makeProjectDir(
  name: string,
  pkg: Record<string, unknown>,
  extra: Record<string, string> = {},
): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-gen-${name}-`));
  tempDirs.push(dir);
  writeFileWithParents(join(dir, "package.json"), JSON.stringify(pkg));
  for (const [rel, content] of Object.entries(extra)) {
    writeFileWithParents(join(dir, rel), content);
  }
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("generateAllFiles formatting", () => {
  const standardPkg = {
    name: "format-app",
    scripts: {
      dev: "vite",
      build: "tsc",
      test: "vitest run",
    },
    dependencies: { vite: "5.0.0", react: "18.0.0" },
  };

  it("AGENTS.md has no triple blank lines", () => {
    const dir = makeProjectDir("agents-spacing", standardPkg, {
      "pnpm-lock.yaml": "",
      "src/.gitkeep": "",
    });
    const { "AGENTS.md": agents } = generateAllFiles(readProject(dir));

    expect(agents).not.toMatch(/\n{3,}/);
  });

  it("AGENTS.md has single blank line before Files To Avoid Editing", () => {
    const dir = makeProjectDir("agents-section-gap", standardPkg, {
      "pnpm-lock.yaml": "",
    });
    const { "AGENTS.md": agents } = generateAllFiles(readProject(dir));

    expect(agents).toContain(
      "- Avoid scanning or modifying `node_modules`, `.git`, `.ready-for-agents`, `dist`, `build`, `.next`, and `coverage`.\n\n## Files To Avoid Editing",
    );
  });

  it("COMMANDS.md uses short Setup label when package manager is npm fallback", () => {
    const dir = makeProjectDir("commands-fallback", {
      name: "fallback-app",
      scripts: { build: "tsc" },
    });
    const ctx = readProject(dir);
    expect(ctx.packageManagerSource).toBe("fallback");

    const { "COMMANDS.md": commands } = generateAllFiles(ctx);

    expect(commands).toContain(
      "Install dependencies:\n\n```bash\nnpm install\n```",
    );
    expect(commands).not.toContain("npm (fallback) (no lockfile");
  });

  it("each generated file ends with exactly one newline", () => {
    const dir = makeProjectDir("trailing-newline", standardPkg, {
      "pnpm-lock.yaml": "",
      "README.md": "# Hi",
    });
    const files = generateAllFiles(readProject(dir));

    for (const name of Object.keys(files) as OutputFile[]) {
      const content = files[name]!;
      expect(content.endsWith("\n"), `${name} should end with newline`).toBe(
        true,
      );
      expect(
        content.endsWith("\n\n"),
        `${name} should not end with double newline`,
      ).toBe(false);
    }
  });

  it("can generate Cursor, Claude, and Copilot files on demand", () => {
    const dir = makeProjectDir("agent-native", standardPkg, {
      "pnpm-lock.yaml": "",
      "README.md": "# Hi",
    });
    const files = generateAllFiles(readProject(dir), [
      "core",
      "cursor",
      "claude",
      "copilot",
    ]);

    expect(files[".cursor/rules/ready-for-agents.mdc"]).toContain(
      "alwaysApply: true",
    );
    expect(files[".cursor/rules/ready-for-agents.mdc"]).toContain(
      "Read `AGENTS.md`",
    );
    expect(files["CLAUDE.md"]).toContain("# CLAUDE.md");
    expect(files["CLAUDE.md"]).toContain("Response Expectations");
    expect(files[".github/copilot-instructions.md"]).toContain(
      "# GitHub Copilot Instructions",
    );
    expect(files[".github/copilot-instructions.md"]).toContain(
      "GitHub Copilot Chat",
    );
  });

  it("generates a marked GitHub Actions workflow", () => {
    const files = generateCiWorkflowFile();
    const workflow = files[".github/workflows/ready-for-agents.yml"]!;

    expect(workflow).toContain("name: ready-for-agents");
    expect(workflow).toContain("rfa doctor --json --cwd .");
    expect(workflow).toContain("rfa diff --json --cwd .");
    expect(workflow).toContain(
      '# ready-for-agents:generated file=".github/workflows/ready-for-agents.yml"',
    );
    expect(workflow).not.toContain("<!-- ready-for-agents:generated");
  });
});
