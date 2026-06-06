import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pc from "picocolors";
import {
  resolveFilePresetOptions,
  toGeneratePresets,
} from "../config/apply.js";
import { readReadyForAgentsConfig } from "../config/read.js";
import {
  readProject,
  resolveProjectCwd,
  validateInitTarget,
} from "../fs/read-project.js";
import { stripGeneratedMarker } from "../generators/index.js";
import { generateAllFiles } from "../generators/index.js";
import type { OutputFile } from "../types.js";
import { checkGeneratedFiles, type UpdateCheckJsonOutput } from "./update.js";

export type DiffOptions = {
  cwd?: string;
  json?: boolean;
  cursor?: boolean;
  claude?: boolean;
  copilot?: boolean;
  all?: boolean;
};

export type GeneratedDiff = {
  file: OutputFile;
  diff: string;
};

export type DiffJsonOutput = UpdateCheckJsonOutput & {
  diffs: GeneratedDiff[];
};

export async function runDiff(options: DiffOptions): Promise<number> {
  const validationError = validateInitTarget(options.cwd);
  if (validationError) {
    const output = {
      cwd: resolveProjectCwd(options.cwd),
      ok: false,
      error: validationError,
      upToDate: [],
      outdated: [],
      missing: [],
      untracked: [],
      diffs: [],
    };
    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.error(pc.red(validationError));
    }
    return 1;
  }

  const cwd = resolveProjectCwd(options.cwd);
  const configResult = readReadyForAgentsConfig(cwd);
  if (!configResult.ok) {
    const output = {
      cwd,
      ok: false,
      error: configResult.error,
      upToDate: [],
      outdated: [],
      missing: [],
      untracked: [],
      diffs: [],
    };
    if (options.json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.error(pc.red(configResult.error));
    }
    return 1;
  }

  const ctx = readProject(cwd);
  const effective = resolveFilePresetOptions(options, configResult.config);
  const files = generateAllFiles(ctx, toGeneratePresets(effective));
  const check = checkGeneratedFiles(cwd, files);
  const output: DiffJsonOutput = {
    ...check,
    diffs: buildGeneratedDiffs(cwd, check.outdated, files),
  };

  if (options.json) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printDiffResult(output);
  }

  return output.ok ? 0 : 1;
}

function buildGeneratedDiffs(
  cwd: string,
  outdated: OutputFile[],
  files: Partial<Record<OutputFile, string>>,
): GeneratedDiff[] {
  return outdated.flatMap((file) => {
    const targetPath = join(cwd, file);
    if (!existsSync(targetPath) || files[file] === undefined) return [];

    const current = stripGeneratedMarker(readFileSync(targetPath, "utf-8"));
    const expected = stripGeneratedMarker(files[file]!);
    const diff = createUnifiedDiff(file, current, expected);
    return diff ? [{ file, diff }] : [];
  });
}

function printDiffResult(result: DiffJsonOutput): void {
  console.log(pc.bold("rfa diff"));
  console.log();

  printList("Up to date:", result.upToDate);
  printList("Outdated:", result.outdated);
  printList("Missing:", result.missing);
  printList("Untracked:", result.untracked);

  if (result.ok) {
    console.log(pc.green("All selected generated context files are current."));
    return;
  }

  for (const item of result.diffs) {
    console.log(item.diff);
    console.log();
  }

  console.log(
    pc.yellow(
      "Run `rfa update` to refresh tracked generated files. Use `--force` only when you intentionally want to overwrite untracked files.",
    ),
  );
}

function printList(title: string, files: string[]): void {
  if (files.length === 0) return;
  console.log(title);
  for (const file of files) {
    console.log(`- ${file}`);
  }
  console.log();
}

type DiffOp = {
  type: "equal" | "delete" | "insert";
  line: string;
};

export function createUnifiedDiff(
  file: OutputFile,
  current: string,
  expected: string,
): string {
  if (current === expected) return "";

  const ops = buildDiffOps(toLines(current), toLines(expected));
  const hunks = selectHunks(ops, 3);
  const lines = [
    `diff -- ${file}`,
    `--- current/${file}`,
    `+++ generated/${file}`,
  ];

  for (const hunk of hunks) {
    lines.push("@@");
    for (const op of hunk) {
      const prefix =
        op.type === "equal" ? " " : op.type === "delete" ? "-" : "+";
      lines.push(`${prefix}${op.line}`);
    }
  }

  return lines.join("\n");
}

function toLines(content: string): string[] {
  if (content === "") return [];
  return content.replace(/\n$/u, "").split("\n");
}

function buildDiffOps(current: string[], expected: string[]): DiffOp[] {
  const dp = Array.from({ length: current.length + 1 }, () =>
    Array<number>(expected.length + 1).fill(0),
  );

  for (let i = current.length - 1; i >= 0; i -= 1) {
    for (let j = expected.length - 1; j >= 0; j -= 1) {
      dp[i]![j] =
        current[i] === expected[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;

  while (i < current.length || j < expected.length) {
    if (
      i < current.length &&
      j < expected.length &&
      current[i] === expected[j]
    ) {
      ops.push({ type: "equal", line: current[i]! });
      i += 1;
      j += 1;
    } else if (
      j < expected.length &&
      (i === current.length || dp[i]![j + 1]! >= dp[i + 1]![j]!)
    ) {
      ops.push({ type: "insert", line: expected[j]! });
      j += 1;
    } else if (i < current.length) {
      ops.push({ type: "delete", line: current[i]! });
      i += 1;
    }
  }

  return ops;
}

function selectHunks(ops: DiffOp[], contextLines: number): DiffOp[][] {
  const changed = ops
    .map((op, index) => (op.type === "equal" ? -1 : index))
    .filter((index) => index >= 0);

  if (changed.length === 0) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  for (const index of changed) {
    const start = Math.max(0, index - contextLines);
    const end = Math.min(ops.length, index + contextLines + 1);
    const last = ranges.at(-1);
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
    } else {
      ranges.push({ start, end });
    }
  }

  return ranges.map((range) => ops.slice(range.start, range.end));
}
