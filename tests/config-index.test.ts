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
import { runConfigInit } from "../src/commands/config.js";
import { runIndex } from "../src/commands/index.js";
import { runInit } from "../src/commands/init.js";
import { runPrompt } from "../src/commands/prompt.js";
import {
  CONFIG_FILE,
  DEFAULT_INDEX_OUTPUT,
  LEGACY_CONFIG_FILE,
} from "../src/config/types.js";
import { readReadyForAgentsConfig } from "../src/config/read.js";
import type { ContextTree } from "../src/indexer/context-tree.js";

const tempDirs: string[] = [];

function writeFileWithParents(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function makeProject(name: string, extra: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-config-index-${name}-`));
  tempDirs.push(dir);
  const files = {
    "package.json": JSON.stringify({
      name: "config-index-app",
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

describe("runConfigInit", () => {
  it("previews default config without writing in dry-run mode", async () => {
    const dir = makeProject("config-dry");
    const { output } = captureConsole();

    const code = await runConfigInit({ cwd: dir, dryRun: true });

    expect(code).toBe(0);
    expect(existsSync(join(dir, CONFIG_FILE))).toBe(false);
    expect(output()).toContain("rfa config init");
    expect(output()).toContain(CONFIG_FILE);
    expect(output()).toContain(DEFAULT_INDEX_OUTPUT);
    expect(output()).toContain("Dry run");
  });

  it("creates config and preserves it unless --force is used", async () => {
    const dir = makeProject("config-write");

    expect(await runConfigInit({ cwd: dir })).toBe(0);
    const target = join(dir, CONFIG_FILE);
    const original = readFileSync(target, "utf-8");
    expect(original).toContain(DEFAULT_INDEX_OUTPUT);

    writeFileSync(target, '{"files":{"index":false}}\n');
    expect(await runConfigInit({ cwd: dir })).toBe(0);
    expect(readFileSync(target, "utf-8")).toContain('"index":false');

    expect(await runConfigInit({ cwd: dir, force: true })).toBe(0);
    expect(readFileSync(target, "utf-8")).toContain(DEFAULT_INDEX_OUTPUT);
  });
});

describe("readReadyForAgentsConfig", () => {
  it("supports the legacy .agent-context-kit.json filename", () => {
    const dir = makeProject("legacy-config", {
      [LEGACY_CONFIG_FILE]: JSON.stringify({
        files: { claude: true, index: false },
        prompt: { target: "vi" },
        index: { output: ".cache/context-tree.json" },
      }),
    });

    const result = readReadyForAgentsConfig(dir);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.sourcePath).toBe(join(dir, LEGACY_CONFIG_FILE));
    expect(result.config.files.claude).toBe(true);
    expect(result.config.files.index).toBe(false);
    expect(result.config.prompt.target).toBe("vi");
    expect(result.config.index.output).toBe(".cache/context-tree.json");
  });
});

describe("config defaults in commands", () => {
  it("lets config turn on optional files and choose index output", async () => {
    const dir = makeProject("config-init", {
      [CONFIG_FILE]: JSON.stringify({
        files: { cursor: true, claude: true, index: true },
        index: { output: ".cache/ready-for-agents-tree.json" },
      }),
    });

    const code = await runInit({ cwd: dir });

    expect(code).toBe(0);
    expect(existsSync(join(dir, ".cursor/rules/ready-for-agents.mdc"))).toBe(
      true,
    );
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, ".cache/ready-for-agents-tree.json"))).toBe(
      true,
    );
  });

  it("lets config disable the index unless --index is passed", async () => {
    const dir = makeProject("config-no-index", {
      [CONFIG_FILE]: JSON.stringify({
        files: { index: false },
      }),
    });

    expect(await runInit({ cwd: dir })).toBe(0);
    expect(existsSync(join(dir, DEFAULT_INDEX_OUTPUT))).toBe(false);

    expect(await runInit({ cwd: dir, index: true })).toBe(0);
    expect(existsSync(join(dir, DEFAULT_INDEX_OUTPUT))).toBe(true);
  });

  it("uses prompt.target from config when --target is omitted", async () => {
    const dir = makeProject("config-prompt", {
      [CONFIG_FILE]: JSON.stringify({
        prompt: { target: "vi" },
      }),
    });
    const { output } = captureConsole();

    const code = await runPrompt({
      cwd: dir,
      text: "Explain what the prompt command does.",
    });

    expect(code).toBe(0);
    expect(output()).toContain("Trả lời bằng tiếng Việt");
  });
});

describe("runIndex", () => {
  it("writes a context tree for generated agent files", async () => {
    const dir = makeProject("index-write");
    await runInit({ cwd: dir, index: false });

    const code = await runIndex({ cwd: dir });
    const treePath = join(dir, DEFAULT_INDEX_OUTPUT);
    const tree = JSON.parse(readFileSync(treePath, "utf-8")) as ContextTree;

    expect(code).toBe(0);
    expect(tree.tool).toBe("ready-for-agents");
    expect(tree.project.name).toBe("config-index-app");
    expect(tree.files.find((file) => file.path === "AGENTS.md")?.exists).toBe(
      true,
    );
    expect(
      tree.files
        .find((file) => file.path === "AGENTS.md")
        ?.sections.some((section) => section.heading === "Project Goal"),
    ).toBe(true);
  });

  it("previews index metadata without writing in dry-run mode", async () => {
    const dir = makeProject("index-dry");
    await runInit({ cwd: dir, index: false });
    const { output } = captureConsole();

    const code = await runIndex({ cwd: dir, dryRun: true });

    expect(code).toBe(0);
    expect(existsSync(join(dir, DEFAULT_INDEX_OUTPUT))).toBe(false);
    expect(output()).toContain("Files indexed:");
    expect(output()).toContain("Dry run");
  });

  it("prints machine-readable JSON", async () => {
    const dir = makeProject("index-json");
    await runInit({ cwd: dir, index: false });
    const { output } = captureConsole();

    const code = await runIndex({ cwd: dir, json: true });
    const parsed = JSON.parse(output()) as { ok: boolean; tree: ContextTree };

    expect(code).toBe(0);
    expect(parsed.ok).toBe(true);
    expect(parsed.tree.files.length).toBeGreaterThan(0);
    expect(existsSync(join(dir, DEFAULT_INDEX_OUTPUT))).toBe(false);
  });
});
