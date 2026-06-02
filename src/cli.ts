#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runPrompt } from "./commands/prompt.js";
import { runUpdate } from "./commands/update.js";

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
  .option("--cursor", "Also generate .cursor/rules/agent-context-kit.mdc")
  .option("--claude", "Also generate CLAUDE.md")
  .option("--all", "Generate all optional agent files")
  .option("--cwd <path>", "Project directory to scan", process.cwd())
  .action(
    async (opts: {
      dryRun?: boolean;
      force?: boolean;
      cursor?: boolean;
      claude?: boolean;
      all?: boolean;
      cwd: string;
    }) => {
      const code = await runInit({
        dryRun: opts.dryRun,
        force: opts.force,
        cursor: opts.cursor,
        claude: opts.claude,
        all: opts.all,
        cwd: opts.cwd,
      });
      process.exit(code);
    },
  );

program
  .command("doctor")
  .description("Check if the repository is AI-agent-ready")
  .option("--cwd <path>", "Project directory to check", process.cwd())
  .option("--json", "Print machine-readable JSON output for CI")
  .option("--fix", "Generate or refresh fixable context files")
  .option("--dry-run", "Preview --fix changes without writing files")
  .option("--force", "With --fix, overwrite untracked context files")
  .option("--cursor", "With --fix, include .cursor/rules/agent-context-kit.mdc")
  .option("--claude", "With --fix, include CLAUDE.md")
  .option("--all", "With --fix, include all optional agent files")
  .action(
    async (opts: {
      cwd: string;
      json?: boolean;
      fix?: boolean;
      dryRun?: boolean;
      force?: boolean;
      cursor?: boolean;
      claude?: boolean;
      all?: boolean;
    }) => {
      const code = await runDoctor({
        cwd: opts.cwd,
        json: opts.json,
        fix: opts.fix,
        dryRun: opts.dryRun,
        force: opts.force,
        cursor: opts.cursor,
        claude: opts.claude,
        all: opts.all,
      });
      process.exit(code);
    },
  );

program
  .command("update")
  .description("Refresh generated context files for the current project")
  .option("--dry-run", "Preview refreshed content without writing files")
  .option("--check", "Check whether generated context files are stale")
  .option("--json", "Print machine-readable JSON for update checks")
  .option("--force", "Overwrite untracked files as well")
  .option("--cursor", "Also refresh .cursor/rules/agent-context-kit.mdc")
  .option("--claude", "Also refresh CLAUDE.md")
  .option("--all", "Refresh all optional agent files")
  .option("--cwd <path>", "Project directory to update", process.cwd())
  .action(
    async (opts: {
      dryRun?: boolean;
      check?: boolean;
      json?: boolean;
      force?: boolean;
      cursor?: boolean;
      claude?: boolean;
      all?: boolean;
      cwd: string;
    }) => {
      const code = await runUpdate({
        dryRun: opts.dryRun,
        check: opts.check,
        json: opts.json,
        force: opts.force,
        cursor: opts.cursor,
        claude: opts.claude,
        all: opts.all,
        cwd: opts.cwd,
      });
      process.exit(code);
    },
  );

program
  .command("prompt")
  .description(
    "Turn rough instructions into compact, structured agent-ready prompts",
  )
  .argument("[text]", "Instruction text")
  .option("--stdin", "Read instruction from stdin")
  .option("--file <path>", "Read instruction from file")
  .option(
    "--target <target>",
    "Response language target: auto, en, or vi",
    "auto",
  )
  .option("--json", "Print JSON instead of Markdown")
  .option("--stats", "Print size stats on stderr")
  .action(
    async (
      text: string | undefined,
      opts: {
        stdin?: boolean;
        file?: string;
        target?: string;
        json?: boolean;
        stats?: boolean;
      },
    ) => {
      const code = await runPrompt({
        text,
        stdin: opts.stdin,
        file: opts.file,
        target: opts.target,
        json: opts.json,
        stats: opts.stats,
      });
      process.exit(code);
    },
  );

program.parse();
