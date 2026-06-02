export { runInit } from "./commands/init.js";
export { runDoctor } from "./commands/doctor.js";
export type { DoctorOptions } from "./commands/doctor.js";
export { runPrompt, buildPromptFromText } from "./commands/prompt.js";
export {
  runUpdate,
  checkGeneratedFiles,
  writeUpdateFiles,
} from "./commands/update.js";
export type {
  UpdateCheckJsonOutput,
  UpdateOptions,
  UpdateWriteResult,
} from "./commands/update.js";
export { normalizePromptText } from "./prompt/normalize.js";
export { segmentPromptText, extractCommands } from "./prompt/segment.js";
export { classifyPromptIntent } from "./prompt/classify.js";
export { extractPromptBrief } from "./prompt/extract.js";
export { renderPromptBrief, toPromptJson } from "./prompt/render.js";
export type {
  PromptBrief,
  PromptIntent,
  PromptJsonOutput,
  PromptOptions,
  PromptSource,
  PromptTarget,
} from "./prompt/types.js";
export { runDoctorChecks } from "./doctor/checks.js";
export { formatScore, hasCriticalFailure } from "./doctor/score.js";
export type {
  DoctorCheck,
  DoctorCheckStatus,
  DoctorResult,
} from "./doctor/checks.js";
export {
  packageManagerLabel,
  stackDatabaseDisplay,
  stackFrameworkDisplay,
} from "./detectors/labels.js";
export { detectImportantFolders } from "./detectors/folders.js";
export {
  detectPackageManagerFromLockfile,
  parsePackageManagerField,
  resolvePackageManager,
} from "./detectors/package-manager.js";
export {
  detectStack,
  formatStackLayerSources,
  stackDatabaseSummary,
  stackFrameworkSummary,
} from "./detectors/stack.js";
export {
  findRelatedScripts,
  formatScriptListForTerminal,
  parseScriptRefsFromCommand,
  pickCommonScripts,
  runScriptCommand,
} from "./detectors/scripts.js";
export {
  generateAllFiles,
  generateClaudeMd,
  generateCursorRules,
} from "./generators/index.js";
export {
  hasReadme,
  readProject,
  resolveProjectCwd,
  validateInitTarget,
} from "./fs/read-project.js";
export { validateCwd } from "./fs/validate.js";
export type {
  GeneratedFiles,
  GeneratePreset,
  OutputFile,
  PackageManager,
  PackageManagerSource,
  ProjectContext,
  ProjectStack,
  ScriptKey,
  StackLayer,
} from "./types.js";
export { SCRIPT_KEYS } from "./types.js";
