import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { GeneratedFileMap, OutputFile } from "../types.js";
import { OUTPUT_FILES } from "../types.js";

export type WriteResult = {
  created: OutputFile[];
  overwritten: OutputFile[];
  skipped: OutputFile[];
};

export function getExistingOutputFiles(cwd: string): OutputFile[] {
  return OUTPUT_FILES.filter((name) => existsSync(join(cwd, name)));
}

export function getGeneratedFileNames(files: GeneratedFileMap): OutputFile[] {
  return OUTPUT_FILES.filter((name) => files[name] !== undefined);
}

export function planWriteActions(
  cwd: string,
  force: boolean,
  files?: GeneratedFileMap,
): {
  wouldCreate: OutputFile[];
  wouldOverwrite: OutputFile[];
  wouldSkip: OutputFile[];
} {
  const existing = getExistingOutputFiles(cwd);
  const targets = files ? getGeneratedFileNames(files) : OUTPUT_FILES;
  const wouldCreate: OutputFile[] = [];
  const wouldOverwrite: OutputFile[] = [];
  const wouldSkip: OutputFile[] = [];

  for (const name of targets) {
    if (!existing.includes(name)) {
      wouldCreate.push(name);
    } else if (force) {
      wouldOverwrite.push(name);
    } else {
      wouldSkip.push(name);
    }
  }

  return { wouldCreate, wouldOverwrite, wouldSkip };
}

export function writeGeneratedFiles(
  cwd: string,
  files: GeneratedFileMap,
  options: { force: boolean },
): WriteResult {
  const result: WriteResult = {
    created: [],
    overwritten: [],
    skipped: [],
  };

  for (const name of getGeneratedFileNames(files)) {
    const targetPath = join(cwd, name);
    const content = files[name]!;
    const existed = existsSync(targetPath);

    if (existed && !options.force) {
      result.skipped.push(name);
      continue;
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content, "utf-8");

    if (existed) {
      result.overwritten.push(name);
    } else {
      result.created.push(name);
    }
  }

  return result;
}
