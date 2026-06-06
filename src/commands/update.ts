import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import pc from "picocolors";
import { formatDetectedSummary } from "./output.js";
import {
  resolveFilePresetOptions,
  toGeneratePresets,
} from "../config/apply.js";
import { readReadyForAgentsConfig } from "../config/read.js";
import { generateAllFiles } from "../generators/index.js";
import { hasGeneratedMarker } from "../generators/marker.js";
import {
  buildContextTree,
  resolveIndexOutput,
  writeContextTree,
} from "../indexer/context-tree.js";
import {
  readProject,
  resolveProjectCwd,
  validateInitTarget,
} from "../fs/read-project.js";
import { getGeneratedFileNames } from "../fs/write-files.js";
import type { GeneratedFileMap, OutputFile } from "../types.js";

export type UpdateOptions = {
  dryRun?: boolean;
  check?: boolean;
  json?: boolean;
  force?: boolean;
  cwd?: string;
  cursor?: boolean;
  claude?: boolean;
  copilot?: boolean;
  all?: boolean;
  index?: boolean;
};

export type UpdateCheckJsonOutput = {
  cwd: string;
  ok: boolean;
  upToDate: OutputFile[];
  outdated: OutputFile[];
  missing: OutputFile[];
  untracked: OutputFile[];
};

export type UpdateWriteResult = {
  created: OutputFile[];
  overwritten: OutputFile[];
  skippedUntracked: OutputFile[];
};

export async function runUpdate(options: UpdateOptions): Promise<number> {
  const validationError = validateInitTarget(options.cwd);
  if (validationError) {
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            cwd: resolveProjectCwd(options.cwd),
            ok: false,
            error: validationError,
            upToDate: [],
            outdated: [],
            missing: [],
            untracked: [],
          },
          null,
          2,
        ),
      );
    } else {
      console.error(pc.red(validationError));
    }
    return 1;
  }

  const cwd = resolveProjectCwd(options.cwd);
  const configResult = readReadyForAgentsConfig(cwd);
  if (!configResult.ok) {
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            cwd,
            ok: false,
            error: configResult.error,
            upToDate: [],
            outdated: [],
            missing: [],
            untracked: [],
          },
          null,
          2,
        ),
      );
    } else {
      console.error(pc.red(configResult.error));
    }
    return 1;
  }

  const ctx = readProject(cwd);
  const effective = resolveFilePresetOptions(options, configResult.config);
  const files = generateAllFiles(ctx, toGeneratePresets(effective));
  const indexOutput = resolveIndexOutput(cwd, configResult.config.index.output);

  if (options.check) {
    const result = checkGeneratedFiles(cwd, files);
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printCheckResult(result);
    }
    return result.ok ? 0 : 1;
  }

  if (options.json) {
    const result = checkGeneratedFiles(cwd, files);
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }

  printHeader();
  for (const line of formatDetectedSummary(ctx)) {
    console.log(line);
  }
  console.log();

  if (options.dryRun) {
    printUpdateDryRun(cwd, files);
    if (effective.index) {
      printList("Would generate:", [configResult.config.index.output]);
    }
    return 0;
  }

  const result = writeUpdateFiles(cwd, files, {
    force: options.force ?? false,
  });
  printWriteResult(result);
  if (effective.index) {
    writeContextTree(indexOutput, buildContextTree(ctx));
    printList("Generated:", [configResult.config.index.output]);
  }
  return result.skippedUntracked.length > 0 ? 1 : 0;
}

export function checkGeneratedFiles(
  cwd: string,
  files: GeneratedFileMap,
): UpdateCheckJsonOutput {
  const upToDate: OutputFile[] = [];
  const outdated: OutputFile[] = [];
  const missing: OutputFile[] = [];
  const untracked: OutputFile[] = [];

  for (const name of getGeneratedFileNames(files)) {
    const targetPath = join(cwd, name);
    if (!existsSync(targetPath)) {
      missing.push(name);
      continue;
    }

    const current = readFileSync(targetPath, "utf-8");
    if (current === files[name]) {
      upToDate.push(name);
      continue;
    }

    if (hasGeneratedMarker(current, name)) {
      outdated.push(name);
    } else {
      untracked.push(name);
    }
  }

  return {
    cwd,
    ok: outdated.length === 0 && missing.length === 0 && untracked.length === 0,
    upToDate,
    outdated,
    missing,
    untracked,
  };
}

export function writeUpdateFiles(
  cwd: string,
  files: GeneratedFileMap,
  options: { force: boolean },
): UpdateWriteResult {
  const created: OutputFile[] = [];
  const overwritten: OutputFile[] = [];
  const skippedUntracked: OutputFile[] = [];

  for (const name of getGeneratedFileNames(files)) {
    const targetPath = join(cwd, name);
    const exists = existsSync(targetPath);
    if (exists) {
      const current = readFileSync(targetPath, "utf-8");
      if (!options.force && !hasGeneratedMarker(current, name)) {
        skippedUntracked.push(name);
        continue;
      }
    }

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, files[name]!, "utf-8");

    if (exists) {
      overwritten.push(name);
    } else {
      created.push(name);
    }
  }

  return { created, overwritten, skippedUntracked };
}

function printHeader(): void {
  console.log(pc.bold("rfa update"));
  console.log();
}

function printList(title: string, files: string[]): void {
  if (files.length === 0) return;
  console.log(title);
  for (const file of files) {
    console.log(`- ${file}`);
  }
  console.log();
}

function printCheckResult(result: UpdateCheckJsonOutput): void {
  console.log(pc.bold("rfa update check"));
  console.log();
  printList("Up to date:", result.upToDate);
  printList("Outdated:", result.outdated);
  printList("Missing:", result.missing);
  printList("Untracked:", result.untracked);
  if (result.ok) {
    console.log(pc.green("All selected generated files are up to date."));
  } else {
    console.log(
      pc.yellow(
        "Run `rfa update` to refresh tracked files. Use `--force` only if you want to overwrite untracked files.",
      ),
    );
  }
}

function printUpdateDryRun(cwd: string, files: GeneratedFileMap): void {
  const result = checkGeneratedFiles(cwd, files);
  printList("Would generate:", result.missing);
  printList("Would overwrite:", result.outdated);
  printList("Would skip untracked:", result.untracked);
  if (result.upToDate.length > 0)
    printList("Already up to date:", result.upToDate);
  console.log(pc.yellow("Dry run — no files written."));
}

function printWriteResult(result: UpdateWriteResult): void {
  printList("Generated:", result.created);
  printList("Overwritten:", result.overwritten);
  printList("Skipped untracked:", result.skippedUntracked);
  if (result.skippedUntracked.length > 0) {
    console.log(
      pc.yellow(
        "Some files were not generated by ready-for-agents. Re-run with `--force` to overwrite them.",
      ),
    );
  }
}
