import {
  packageManagerLabel,
  stackDatabaseDisplay,
  stackFrameworkDisplay,
} from "../detectors/labels.js";
import { runScriptCommand } from "../detectors/scripts.js";
import type { ProjectContext } from "../types.js";
import { oneTrailingNewline } from "./format.js";
import { formatTestingExpectations } from "./testing-expectations.js";

export function generateClaudeMd(ctx: ProjectContext): string {
  const pmLabel = packageManagerLabel(
    ctx.packageManager,
    ctx.packageManagerSource,
  );
  const framework = stackFrameworkDisplay(ctx.stack);
  const database = ctx.stack.database ? stackDatabaseDisplay(ctx.stack) : null;

  const lines = [
    "# CLAUDE.md",
    "",
    "Guidance for Claude Code and other AI coding agents working in this repository.",
    "",
    "## Project Context",
    "",
    `- Project: **${ctx.name}**`,
    `- Package manager: **${pmLabel}**`,
    `- Framework: **${framework}**`,
    ...(database ? [`- Database: **${database}**`] : []),
    "",
    "## How To Work",
    "",
    "- Read `AGENTS.md`, `PROJECT_CONTEXT.md`, and `COMMANDS.md` before making changes.",
    "- Prefer small, focused edits.",
    "- Preserve user-authored files and existing project conventions.",
    "- Do not invent missing facts about stack, scripts, or deployment.",
    "- Ask for clarification when the requested scope is ambiguous.",
    "",
    "## Files To Avoid",
    "",
    "- Lockfiles unless dependencies change.",
    "- Generated output directories such as `dist/`, `build/`, `.next/`, and `coverage/`.",
    "- `node_modules/` and `.git/`.",
    "",
    "## Verification",
    "",
    formatTestingExpectations(ctx),
  ];

  if (ctx.scripts.build) {
    lines.push(
      `- Build command: \`${runScriptCommand(ctx.packageManager, "build")}\`.`,
    );
  }
  if (ctx.scripts.test) {
    lines.push(
      `- Test command: \`${runScriptCommand(ctx.packageManager, "test")}\`.`,
    );
  }

  lines.push(
    "",
    "## Response Expectations",
    "",
    "- Summarize what changed.",
    "- Include commands run and whether they passed.",
    "- Mention remaining risks or missing verification.",
  );

  return oneTrailingNewline(lines.join("\n"));
}
