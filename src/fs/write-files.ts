import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GeneratedFiles, OutputFile } from "../types.js";
import { OUTPUT_FILES } from "../types.js";

export type WriteResult = {
  created: OutputFile[];
  overwritten: OutputFile[];
  skipped: OutputFile[];
};

export function getExistingOutputFiles(cwd: string): OutputFile[] {
  return OUTPUT_FILES.filter((name) => existsSync(join(cwd, name)));
}

export function planWriteActions(
  cwd: string,
  force: boolean,
): {
  wouldCreate: OutputFile[];
  wouldOverwrite: OutputFile[];
  wouldSkip: OutputFile[];
} {
  const existing = getExistingOutputFiles(cwd);
  const wouldCreate: OutputFile[] = [];
  const wouldOverwrite: OutputFile[] = [];
  const wouldSkip: OutputFile[] = [];

  for (const name of OUTPUT_FILES) {
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
  files: GeneratedFiles,
  options: { force: boolean },
): WriteResult {
  const result: WriteResult = {
    created: [],
    overwritten: [],
    skipped: [],
  };

  for (const name of OUTPUT_FILES) {
    const targetPath = join(cwd, name);
    const content = files[name];
    const existed = existsSync(targetPath);

    if (existed && !options.force) {
      result.skipped.push(name);
      continue;
    }

    writeFileSync(targetPath, content, "utf-8");

    if (existed) {
      result.overwritten.push(name);
    } else {
      result.created.push(name);
    }
  }

  return result;
}
