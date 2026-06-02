import type {
  GeneratedFiles,
  GeneratePreset,
  ProjectContext,
} from "../types.js";
import { generateAgentsMd } from "./agents-md.js";
import { generateClaudeMd } from "./claude-md.js";
import { generateCommandsMd } from "./commands-md.js";
import { generateCursorRules } from "./cursor-rules.js";
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
    files[".cursor/rules/agent-context-kit.mdc"] = generateCursorRules(ctx);
  }
  if (presets.includes("claude")) {
    files["CLAUDE.md"] = generateClaudeMd(ctx);
  }

  return addGeneratedMarkers(files);
}

export {
  generateAgentsMd,
  generateClaudeMd,
  generateCommandsMd,
  generateCursorRules,
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
