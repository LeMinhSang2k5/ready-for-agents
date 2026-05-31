export { runInit } from "./commands/init.js";
export { runDoctor } from "./commands/doctor.js";
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
export { generateAllFiles } from "./generators/index.js";
export {
  hasReadme,
  readProject,
  resolveProjectCwd,
  validateInitTarget,
} from "./fs/read-project.js";
export { validateCwd } from "./fs/validate.js";
export type {
  GeneratedFiles,
  OutputFile,
  PackageManager,
  PackageManagerSource,
  ProjectContext,
  ProjectStack,
  ScriptKey,
  StackLayer,
} from "./types.js";
export { SCRIPT_KEYS } from "./types.js";
