export { runInit } from "./commands/init.js";
export { runDoctor } from "./commands/doctor.js";
export type { DoctorOptions } from "./commands/doctor.js";
export { runConfigInit } from "./commands/config.js";
export type { ConfigInitOptions } from "./commands/config.js";
export { runCi } from "./commands/ci.js";
export type { CiOptions } from "./commands/ci.js";
export { createUnifiedDiff, runDiff } from "./commands/diff.js";
export type {
  DiffJsonOutput,
  DiffOptions,
  GeneratedDiff,
} from "./commands/diff.js";
export { runIndex } from "./commands/index.js";
export type { IndexOptions } from "./commands/index.js";
export { runQuery } from "./commands/query.js";
export type { QueryJsonOutput, QueryOptions } from "./commands/query.js";
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
export {
  CONFIG_FILE,
  DEFAULT_CONFIG,
  DEFAULT_INDEX_OUTPUT,
  INDEX_DIR,
  INDEX_FILE,
  LEGACY_CONFIG_FILE,
} from "./config/types.js";
export { readReadyForAgentsConfig, resolveConfigPath } from "./config/read.js";
export {
  buildContextTree,
  resolveIndexOutput,
  writeContextTree,
} from "./indexer/context-tree.js";
export type {
  ContextTree,
  ContextTreeFile,
  ContextTreeSection,
} from "./indexer/context-tree.js";
export { selectContextSections } from "./query/select.js";
export type { QueryMatch, SelectContextOptions } from "./query/select.js";
export { loadContextTree } from "./query/load.js";
export type { ContextTreeLoadResult } from "./query/load.js";
export { lookupPromptContext } from "./prompt/context.js";
export type { PromptContextLookupResult } from "./prompt/context.js";
export type {
  ReadyForAgentsConfig,
  ResolvedReadyForAgentsConfig,
} from "./config/types.js";
export { segmentPromptText, extractCommands } from "./prompt/segment.js";
export { classifyPromptIntent } from "./prompt/classify.js";
export { extractPromptBrief } from "./prompt/extract.js";
export { renderPromptBrief, toPromptJson } from "./prompt/render.js";
export type {
  PromptBrief,
  PromptContextReference,
  PromptIntent,
  PromptJsonOutput,
  PromptOptions,
  PromptStyle,
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
  generateCiWorkflowFile,
  generateClaudeMd,
  generateCopilotInstructionsMd,
  generateCursorRules,
  generateGithubActionsWorkflow,
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
  GeneratedFileMap,
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
