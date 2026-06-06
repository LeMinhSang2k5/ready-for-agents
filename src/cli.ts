#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInit } from "./commands/init.js";
import { runDoctor } from "./commands/doctor.js";
import { runPrompt } from "./commands/prompt.js";
import { runUpdate } from "./commands/update.js";
import { runIndex } from "./commands/index.js";
import { runConfigInit } from "./commands/config.js";
import { runQuery } from "./commands/query.js";
import { runCi } from "./commands/ci.js";
import { runDiff } from "./commands/diff.js";

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
  .name("rfa")
  .description("Generate AI-agent-ready context files for your repository")
  .version(getVersion());

program
  .command("init")
  .alias("i")
  .description(
    "Scan the project and generate AGENTS.md, PROJECT_CONTEXT.md, COMMANDS.md",
  )
  .option("--dry-run", "Preview generated content without writing files")
  .option("--force", "Overwrite existing context files")
  .option("--cursor", "Also generate .cursor/rules/ready-for-agents.mdc")
  .option("--claude", "Also generate CLAUDE.md")
  .option("--copilot", "Also generate .github/copilot-instructions.md")
  .option("--all", "Generate all optional agent files")
  .option("--index", "Also generate .ready-for-agents/context-tree.json")
  .option("--cwd <path>", "Project directory to scan", process.cwd())
  .action(
    async (opts: {
      dryRun?: boolean;
      force?: boolean;
      cursor?: boolean;
      claude?: boolean;
      copilot?: boolean;
      all?: boolean;
      index?: boolean;
      cwd: string;
    }) => {
      const code = await runInit({
        dryRun: opts.dryRun,
        force: opts.force,
        cursor: opts.cursor,
        claude: opts.claude,
        copilot: opts.copilot,
        all: opts.all,
        index: opts.index,
        cwd: opts.cwd,
      });
      process.exit(code);
    },
  );

program
  .command("doctor")
  .alias("d")
  .description("Check if the repository is AI-agent-ready")
  .option("--cwd <path>", "Project directory to check", process.cwd())
  .option("--json", "Print machine-readable JSON output for CI")
  .option("--fix", "Generate or refresh fixable context files")
  .option("--dry-run", "Preview --fix changes without writing files")
  .option("--force", "With --fix, overwrite untracked context files")
  .option("--cursor", "With --fix, include .cursor/rules/ready-for-agents.mdc")
  .option("--claude", "With --fix, include CLAUDE.md")
  .option("--copilot", "With --fix, include .github/copilot-instructions.md")
  .option("--all", "With --fix, include all optional agent files")
  .option("--index", "With --fix, generate .ready-for-agents/context-tree.json")
  .action(
    async (opts: {
      cwd: string;
      json?: boolean;
      fix?: boolean;
      dryRun?: boolean;
      force?: boolean;
      cursor?: boolean;
      claude?: boolean;
      copilot?: boolean;
      all?: boolean;
      index?: boolean;
    }) => {
      const code = await runDoctor({
        cwd: opts.cwd,
        json: opts.json,
        fix: opts.fix,
        dryRun: opts.dryRun,
        force: opts.force,
        cursor: opts.cursor,
        claude: opts.claude,
        copilot: opts.copilot,
        all: opts.all,
        index: opts.index,
      });
      process.exit(code);
    },
  );

program
  .command("update")
  .alias("u")
  .description("Refresh generated context files for the current project")
  .option("--dry-run", "Preview refreshed content without writing files")
  .option("--check", "Check whether generated context files are stale")
  .option("--json", "Print machine-readable JSON for update checks")
  .option("--force", "Overwrite untracked files as well")
  .option("--cursor", "Also refresh .cursor/rules/ready-for-agents.mdc")
  .option("--claude", "Also refresh CLAUDE.md")
  .option("--copilot", "Also refresh .github/copilot-instructions.md")
  .option("--all", "Refresh all optional agent files")
  .option("--index", "Also regenerate .ready-for-agents/context-tree.json")
  .option("--cwd <path>", "Project directory to update", process.cwd())
  .action(
    async (opts: {
      dryRun?: boolean;
      check?: boolean;
      json?: boolean;
      force?: boolean;
      cursor?: boolean;
      claude?: boolean;
      copilot?: boolean;
      all?: boolean;
      index?: boolean;
      cwd: string;
    }) => {
      const code = await runUpdate({
        dryRun: opts.dryRun,
        check: opts.check,
        json: opts.json,
        force: opts.force,
        cursor: opts.cursor,
        claude: opts.claude,
        copilot: opts.copilot,
        all: opts.all,
        index: opts.index,
        cwd: opts.cwd,
      });
      process.exit(code);
    },
  );

addPromptCommand(
  "prompt",
  "Turn rough instructions into compact, structured agent-ready prompts",
);

addPromptCommand(
  "p",
  "Short alias for prompt with context + compact defaults",
  {
    context: true,
    compact: true,
  },
);

program
  .command("ci")
  .description("Generate a GitHub Actions workflow for ready-for-agents checks")
  .option("--dry-run", "Preview workflow content without writing files")
  .option("--force", "Overwrite existing workflow file")
  .option("--cwd <path>", "Project directory", process.cwd())
  .action(async (opts: { dryRun?: boolean; force?: boolean; cwd: string }) => {
    const code = await runCi({
      dryRun: opts.dryRun,
      force: opts.force,
      cwd: opts.cwd,
    });
    process.exit(code);
  });

program
  .command("diff")
  .description("Show how generated context differs from the current project")
  .option("--cwd <path>", "Project directory to compare", process.cwd())
  .option("--json", "Print machine-readable JSON output")
  .option("--cursor", "Include .cursor/rules/ready-for-agents.mdc")
  .option("--claude", "Include CLAUDE.md")
  .option("--copilot", "Include .github/copilot-instructions.md")
  .option("--all", "Include all optional agent files")
  .action(
    async (opts: {
      cwd: string;
      json?: boolean;
      cursor?: boolean;
      claude?: boolean;
      copilot?: boolean;
      all?: boolean;
    }) => {
      const code = await runDiff({
        cwd: opts.cwd,
        json: opts.json,
        cursor: opts.cursor,
        claude: opts.claude,
        copilot: opts.copilot,
        all: opts.all,
      });
      process.exit(code);
    },
  );

program
  .command("index")
  .alias("x")
  .description("Build a compact context tree for generated agent files")
  .option("--dry-run", "Preview index metadata without writing files")
  .option("--json", "Print the context tree JSON instead of writing files")
  .option("--output <path>", "Output path", undefined)
  .option("--cwd <path>", "Project directory to index", process.cwd())
  .action(
    async (opts: {
      dryRun?: boolean;
      json?: boolean;
      output?: string;
      cwd: string;
    }) => {
      const code = await runIndex({
        dryRun: opts.dryRun,
        json: opts.json,
        output: opts.output,
        cwd: opts.cwd,
      });
      process.exit(code);
    },
  );

program
  .command("query")
  .alias("q")
  .description("Select relevant generated context sections for a task")
  .argument("<text>", "Task or question")
  .option("--cwd <path>", "Project directory to query", process.cwd())
  .option("--json", "Print machine-readable JSON output")
  .option("--limit <number>", "Maximum number of context sections", "6")
  .option("--tree <path>", "Context tree path, defaults to config index.output")
  .action(
    async (
      text: string,
      opts: {
        cwd: string;
        json?: boolean;
        limit?: string;
        tree?: string;
      },
    ) => {
      const code = await runQuery({
        text,
        cwd: opts.cwd,
        json: opts.json,
        limit: opts.limit,
        tree: opts.tree,
      });
      process.exit(code);
    },
  );

const config = program
  .command("config")
  .alias("c")
  .description("Manage project configuration");

config
  .command("init")
  .alias("i")
  .description("Create .ready-for-agents.json")
  .option("--dry-run", "Preview config without writing files")
  .option("--force", "Overwrite existing config")
  .option("--cwd <path>", "Project directory", process.cwd())
  .action(async (opts: { dryRun?: boolean; force?: boolean; cwd: string }) => {
    const code = await runConfigInit({
      dryRun: opts.dryRun,
      force: opts.force,
      cwd: opts.cwd,
    });
    process.exit(code);
  });

program.parse();

type PromptCommandDefaults = {
  context?: boolean;
  compact?: boolean;
};

function addPromptCommand(
  name: string,
  description: string,
  defaults: PromptCommandDefaults = {},
): void {
  program
    .command(name)
    .description(description)
    .argument("[text]", "Instruction text")
    .option("--stdin", "Read instruction from stdin")
    .option("--file <path>", "Read instruction from file")
    .option("--target <target>", "Response language target: auto, en, or vi")
    .option(
      "--cwd <path>",
      "Project directory for config lookup",
      process.cwd(),
    )
    .option("--context", "Include relevant context from context-tree")
    .option("--no-context", "Disable relevant context lookup")
    .option("--compact", "Render a shorter prompt")
    .option("--no-compact", "Render the standard prompt style")
    .option(
      "--context-limit <number>",
      "Maximum relevant context sections",
      "5",
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
          cwd?: string;
          context?: boolean;
          compact?: boolean;
          contextLimit?: string;
          json?: boolean;
          stats?: boolean;
        },
      ) => {
        const compact =
          opts.compact === undefined ? defaults.compact : opts.compact;
        const style =
          compact === undefined ? undefined : compact ? "compact" : "standard";
        const code = await runPrompt({
          text,
          stdin: opts.stdin,
          file: opts.file,
          target: opts.target,
          cwd: opts.cwd,
          context: opts.context === undefined ? defaults.context : opts.context,
          compact,
          style,
          contextLimit: opts.contextLimit,
          json: opts.json,
          stats: opts.stats,
        });
        process.exit(code);
      },
    );
}
