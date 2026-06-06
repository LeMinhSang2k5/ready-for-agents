import type {
  GeneratedFileMap,
  GeneratedFiles,
  GeneratePreset,
  ProjectContext,
} from "../types.js";
import { generateAgentsMd } from "./agents-md.js";
import { generateClaudeMd } from "./claude-md.js";
import { generateCommandsMd } from "./commands-md.js";
import { generateCopilotInstructionsMd } from "./copilot-instructions-md.js";
import { generateCursorRules } from "./cursor-rules.js";
import { generateGithubActionsWorkflow } from "./github-actions-workflow.js";
import { addGeneratedMarkers } from "./marker.js";
import { generateProjectContextMd } from "./project-context-md.js";

export function generateAllFiles(
  ctx: ProjectContext,
  presets: GeneratePreset[] = ["core"],
): GeneratedFiles {
  const files: GeneratedFiles = {
    "AGENTS.md": generateAgentsMd(ctx),
    "PROJECT_CONTEXT.md": generateProjectContextMd(ctx),
    "COMMANDS.md": generateCommandsMd(ctx),
  };

  if (presets.includes("cursor")) {
    files[".cursor/rules/ready-for-agents.mdc"] = generateCursorRules(ctx);
  }
  if (presets.includes("claude")) {
    files["CLAUDE.md"] = generateClaudeMd(ctx);
  }
  if (presets.includes("copilot")) {
    files[".github/copilot-instructions.md"] =
      generateCopilotInstructionsMd(ctx);
  }

  return addGeneratedMarkers(files);
}

export function generateCiWorkflowFile(): GeneratedFileMap {
  return addGeneratedMarkers({
    ".github/workflows/ready-for-agents.yml": generateGithubActionsWorkflow(),
  });
}

export {
  generateAgentsMd,
  generateClaudeMd,
  generateCommandsMd,
  generateCopilotInstructionsMd,
  generateCursorRules,
  generateGithubActionsWorkflow,
  generateProjectContextMd,
};
export {
  addGeneratedMarkers,
  hasGeneratedMarker,
  hashGeneratedContent,
  readGeneratedMarker,
  stripGeneratedMarker,
  withGeneratedMarker,
} from "./marker.js";
