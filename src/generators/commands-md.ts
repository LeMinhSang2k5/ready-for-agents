import {
  findRelatedScripts,
  pickCommonScripts,
  relatedScriptsSection,
  runScriptCommand,
} from "../detectors/scripts.js";
import type { PackageManager, ProjectContext, ScriptKey } from "../types.js";

function installBlock(pm: PackageManager): string {
  switch (pm) {
    case "pnpm":
      return "```bash\npnpm install\n```";
    case "yarn":
      return "```bash\nyarn install\n```";
    case "bun":
      return "```bash\nbun install\n```";
    case "npm":
    default:
      return "```bash\nnpm install\n```";
  }
}

function sectionForScript(
  ctx: ProjectContext,
  title: string,
  scriptKey: ScriptKey,
): string {
  const entry = pickCommonScripts(ctx.scripts)[scriptKey];
  if (!entry) {
    return `## ${title}\n\nNot detected in \`package.json\`.\n\n`;
  }

  const runCmd = runScriptCommand(ctx.packageManager, entry.scriptName);
  let section = `## ${title}

\`package.json\` script: \`${entry.command}\`

\`\`\`bash
${runCmd}
\`\`\`
`;

  if (scriptKey === "dev") {
    const related = findRelatedScripts(ctx.scripts, "dev");
    section += relatedScriptsSection(ctx.packageManager, related);
  }

  return `${section.trimEnd()}\n\n`;
}

export function generateCommandsMd(ctx: ProjectContext): string {
  const setupLabel =
    ctx.packageManagerSource === "fallback"
      ? "Install dependencies:"
      : `Install dependencies (${ctx.packageManager}):`;

  const body = `# COMMANDS.md

Common commands for **${ctx.name}**. Values are taken from \`package.json\` scripts.

## Setup

${setupLabel}

${installBlock(ctx.packageManager)}

${sectionForScript(ctx, "Development", "dev")}${sectionForScript(ctx, "Build", "build")}${sectionForScript(ctx, "Test", "test")}${sectionForScript(ctx, "Lint", "lint")}${sectionForScript(ctx, "Typecheck", "typecheck")}${sectionForScript(ctx, "Format", "format")}`;

  return `${body.trimEnd()}\n`;
}
