import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runInit } from "../src/commands/init.js";
import { runQuery, type QueryJsonOutput } from "../src/commands/query.js";
import { DEFAULT_INDEX_OUTPUT } from "../src/config/types.js";

const tempDirs: string[] = [];

function writeFileWithParents(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function makeProject(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-query-${name}-`));
  tempDirs.push(dir);
  writeFileWithParents(
    join(dir, "package.json"),
    JSON.stringify({
      name: "query-app",
      scripts: {
        dev: "vite",
        build: "vite build",
        test: "vitest run",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        react: "18.0.0",
        vite: "5.0.0",
      },
      devDependencies: {
        typescript: "5.0.0",
        vitest: "3.0.0",
      },
    }),
  );
  writeFileWithParents(join(dir, "pnpm-lock.yaml"), "");
  writeFileWithParents(join(dir, "src/.gitkeep"), "");
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

describe("runQuery", () => {
  it("selects verification sections from live generated context files", async () => {
    const dir = makeProject("live");
    await runInit({ cwd: dir, index: false });
    const { output } = captureConsole();

    const code = await runQuery({
      cwd: dir,
      text: "làm sao kiểm tra build test hoạt động đúng",
      limit: 4,
    });

    expect(code).toBe(0);
    expect(output()).toContain("rfa query");
    expect(output()).toContain("Source: live scan");
    expect(output()).toContain("COMMANDS.md#test");
    expect(output()).toContain("verification context");
  });

  it("uses cached context tree and prints machine-readable JSON", async () => {
    const dir = makeProject("json-cache");
    await runInit({ cwd: dir, index: true });
    expect(existsSync(join(dir, DEFAULT_INDEX_OUTPUT))).toBe(true);
    const { output } = captureConsole();

    const code = await runQuery({
      cwd: dir,
      text: "show stack dependencies and framework",
      json: true,
      limit: 3,
    });
    const parsed = JSON.parse(output()) as QueryJsonOutput;

    expect(code).toBe(0);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.source).toBe("cache");
    expect(parsed.summary.tokensEstimate).toBeGreaterThan(0);
    expect(
      parsed.matches.some((match) => match.file === "PROJECT_CONTEXT.md"),
    ).toBe(true);
    expect(parsed.matches[0]?.reasons.length).toBeGreaterThan(0);
  });

  it("exits 1 for empty query text", async () => {
    const dir = makeProject("empty");
    const { errors } = captureConsole();

    const code = await runQuery({ cwd: dir, text: "   " });

    expect(code).toBe(1);
    expect(errors()).toContain("Query text is required");
  });
});
