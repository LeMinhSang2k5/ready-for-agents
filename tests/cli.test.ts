import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsxBin = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

function cli(args: string[]): string {
  return execFileSync(tsxBin, ["src/cli.ts", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      FORCE_COLOR: "0",
      NO_COLOR: "1",
    },
  });
}

describe("CLI entrypoint", () => {
  it("uses rfa as the canonical command name", () => {
    const output = cli(["--help"]);

    expect(output).toContain("Usage: rfa [options] [command]");
    expect(output).toContain("init|i");
    expect(output).toContain("doctor|d");
    expect(output).toContain("update|u");
    expect(output).toContain("ci");
    expect(output).toContain("diff");
    expect(output).toContain("index|x");
    expect(output).toContain("query|q");
    expect(output).toContain("config|c");
  });

  it.each([
    { args: ["i", "--help"], expected: "Usage: rfa init|i" },
    { args: ["d", "--help"], expected: "Usage: rfa doctor|d" },
    { args: ["u", "--help"], expected: "Usage: rfa update|u" },
    { args: ["p", "--help"], expected: "Usage: rfa p" },
    { args: ["ci", "--help"], expected: "Usage: rfa ci" },
    { args: ["diff", "--help"], expected: "Usage: rfa diff" },
    { args: ["x", "--help"], expected: "Usage: rfa index|x" },
    { args: ["q", "--help"], expected: "Usage: rfa query|q" },
    { args: ["c", "i", "--help"], expected: "Usage: rfa config init|i" },
  ])("prints command help: $args", ({ args, expected }) => {
    expect(cli(args)).toContain(expected);
  });
});
