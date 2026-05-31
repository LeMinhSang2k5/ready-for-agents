import {
  packageManagerLabel,
  stackDatabaseDisplay,
  stackFrameworkDisplay,
} from "../detectors/labels.js";
import { hasReadme } from "../fs/read-project.js";
import type { ProjectContext } from "../types.js";
import { formatFolderBullets } from "./format.js";
import { formatTestingExpectations } from "./testing-expectations.js";

function stackLinesForAgents(stack: ProjectContext["stack"]): string {
  const lines: string[] = [];
  lines.push(`- Framework: **${stackFrameworkDisplay(stack)}**`);

  if (stack.database) {
    lines.push(`- Database: **${stackDatabaseDisplay(stack)}**`);
  }

  return lines.join("\n");
}

export function generateAgentsMd(ctx: ProjectContext): string {
  const pm = packageManagerLabel(ctx.packageManager, ctx.packageManagerSource);
  const projectKind = stackFrameworkDisplay(ctx.stack);
  const folderBlock = formatFolderBullets(ctx.folders);
  const importantRules = [
    "- Do not guess package manager or scripts; use values from `package.json` and `COMMANDS.md`.",
    "- Match existing code style and patterns in the repo.",
    "- Do not edit lockfiles unless the task explicitly requires dependency updates.",
    "- Avoid scanning or modifying `node_modules`, `.git`, `dist`, `build`, `.next`, and `coverage`.",
  ];

  if (hasReadme(ctx.cwd)) {
    importantRules.push(
      "- Check `README.md` for human-oriented setup and product notes.",
    );
  }

  return `# AGENTS.md

## Project Goal

This repository is **${ctx.name}**, a **${projectKind}** project. AI coding agents should help maintain and extend the codebase while respecting existing conventions and scripts.

## How To Work In This Repo

- Package manager: **${pm}** (use this for install and script commands).
${stackLinesForAgents(ctx.stack)}
- Prefer small, focused changes with clear scope.
- Read \`PROJECT_CONTEXT.md\` for stack and folder layout.
- Read \`COMMANDS.md\` for development, build, test, and lint commands.

### Important Folders
${folderBlock}

## Important Rules

${importantRules.join("\n")}

## Files To Avoid Editing

- Lockfiles (\`package-lock.json\`, \`pnpm-lock.yaml\`, \`yarn.lock\`, \`bun.lock\`, \`bun.lockb\`) unless dependencies change.
- Generated output directories (\`dist/\`, \`build/\`, \`.next/\`) unless rebuilding is required.
- This file and other agent context files unless the user asks to refresh them with \`agent-context-kit init --force\`.

## Testing Expectations

${formatTestingExpectations(ctx)}
`;
}
