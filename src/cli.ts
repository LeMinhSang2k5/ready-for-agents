#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      version?: string;
    };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const program = new Command();

program
  .name("agent-context-kit")
  .description("Generate AI-agent-ready context files for your repository")
  .version(getVersion());

program
  .command("init")
  .description(
    "Scan the project and generate AGENTS.md, PROJECT_CONTEXT.md, COMMANDS.md",
  )
  .option("--dry-run", "Preview generated content without writing files")
  .option("--force", "Overwrite existing context files")
  .option("--cwd <path>", "Project directory to scan", process.cwd())
  .action(async (opts: { dryRun?: boolean; force?: boolean; cwd: string }) => {
    const code = await runInit({
      dryRun: opts.dryRun,
      force: opts.force,
      cwd: opts.cwd,
    });
    process.exit(code);
  });

program
  .command("doctor")
  .description("Check if the repository is AI-agent-ready")
  .option("--cwd <path>", "Project directory to check", process.cwd())
  .option("--json", "Print machine-readable JSON output for CI")
  .action(async (opts: { cwd: string; json?: boolean }) => {
    const code = await runDoctor({ cwd: opts.cwd, json: opts.json });
    process.exit(code);
  });

program.parse();
