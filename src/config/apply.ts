import type { GeneratePreset } from "../types.js";
import type { ResolvedReadyForAgentsConfig } from "./types.js";

export type FilePresetOptions = {
  cursor?: boolean;
  claude?: boolean;
  copilot?: boolean;
  all?: boolean;
  index?: boolean;
};

export function resolveFilePresetOptions(
  options: FilePresetOptions,
  config: ResolvedReadyForAgentsConfig,
): Required<FilePresetOptions> {
  return {
    cursor: options.cursor ?? config.files.cursor,
    claude: options.claude ?? config.files.claude,
    copilot: options.copilot ?? config.files.copilot,
    all: options.all ?? config.files.all,
    index: options.index ?? config.files.index,
  };
}

export function resolveDoctorFixOptions(
  options: FilePresetOptions & { force?: boolean },
  config: ResolvedReadyForAgentsConfig,
): Required<FilePresetOptions & { force: boolean }> {
  return {
    cursor: options.cursor ?? (config.doctor.fix.cursor || config.files.cursor),
    claude: options.claude ?? (config.doctor.fix.claude || config.files.claude),
    copilot:
      options.copilot ?? (config.doctor.fix.copilot || config.files.copilot),
    all: options.all ?? (config.doctor.fix.all || config.files.all),
    index: options.index ?? (config.doctor.fix.index || config.files.index),
    force: options.force ?? config.doctor.fix.force,
  };
}

export function toGeneratePresets(
  options: FilePresetOptions,
): GeneratePreset[] {
  const presets: GeneratePreset[] = ["core"];
  if (options.all || options.cursor) presets.push("cursor");
  if (options.all || options.claude) presets.push("claude");
  if (options.all || options.copilot) presets.push("copilot");
  return presets;
}
