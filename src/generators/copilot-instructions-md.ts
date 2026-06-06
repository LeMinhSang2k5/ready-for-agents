import {
  packageManagerLabel,
  stackDatabaseDisplay,
  stackFrameworkDisplay,
} from "../detectors/labels.js";
import { runScriptCommand } from "../detectors/scripts.js";
import type { ProjectContext } from "../types.js";
import { oneTrailingNewline } from "./format.js";
import { formatTestingExpectations } from "./testing-expectations.js";

export function generateCopilotInstructionsMd(ctx: ProjectContext): string {
  const pmLabel = packageManagerLabel(
    ctx.packageManager,
    ctx.packageManagerSource,
  );
  const framework = stackFrameworkDisplay(ctx.stack);
  const database = ctx.stack.database ? stackDatabaseDisplay(ctx.stack) : null;

  const lines = [
    "# GitHub Copilot Instructions",
    "",
    "Repository guidance for GitHub Copilot Chat, code review, and coding agent workflows.",
    "",
    "## Project Context",
    "",
    `- Project: **${ctx.name}**`,
    `- Package manager: **${pmLabel}**`,
    `- Framework: **${framework}**`,
    ...(database ? [`- Database: **${database}**`] : []),
    "",
    "## Working Rules",
    "",
    "- Read `AGENTS.md`, `PROJECT_CONTEXT.md`, and `COMMANDS.md` before making larger changes.",
    "- Use commands from `COMMANDS.md`; do not guess package manager commands.",
    "- Keep edits focused and consistent with the existing project structure.",
    "- Preserve user-authored files and avoid unrelated formatting churn.",
    "- Do not edit lockfiles unless the task requires dependency changes.",
    "- Avoid scanning or modifying `node_modules`, `.git`, `.ready-for-agents`, `dist`, `build`, `.next`, and `coverage`.",
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
    "- State the files changed.",
    "- Include verification commands and results.",
    "- Mention any skipped checks or remaining risk.",
  );

  return oneTrailingNewline(lines.join("\n"));
}
