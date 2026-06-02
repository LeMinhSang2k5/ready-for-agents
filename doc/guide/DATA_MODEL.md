# Mô hình dữ liệu

Nguồn truth trong code: `src/types.ts`.

---

## 1. Luồng dữ liệu tổng quát

```mermaid
flowchart LR
  subgraph disk [Project on disk]
    PKG[package.json]
    LOCK[lockfiles]
    FOLD[root folders]
  end

  subgraph init_flow [init]
    PKG --> RP[readProject]
    LOCK --> RP
    FOLD --> RP
    RP --> PC[ProjectContext]
    PC --> GEN[GeneratedFiles]
    GEN --> WR[writeGeneratedFiles]
  end

  subgraph doctor_flow [doctor]
    PKG --> DC[runDoctorChecks]
    LOCK --> DC
    DC --> DR[DoctorResult]
    DR --> SC[formatScore]
  end
```

---

## 2. `ProjectContext`

Object trung tâm sau khi quét project (lệnh `init`).

```ts
type ProjectContext = {
  cwd: string; // absolute path
  name: string; // package.json name
  packageManager: PackageManager; // npm | pnpm | yarn | bun
  packageManagerSource: PackageManagerSource; // lockfile | package.json | fallback
  stack: ProjectStack;
  scripts: Record<string, string>; // raw package.json scripts
  folders: string[]; // subset of IMPORTANT_FOLDERS
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};
```

**Tạo bởi:** `readProject(cwd)` trong `fs/read-project.ts`.

**Tiêu thụ bởi:** `generateAllFiles(ctx)` → generators.

---

## 3. `ProjectStack` & `StackLayer`

```ts
type StackLayer = {
  label: string; // e.g. "React/Vite"
  source: string[]; // e.g. ["vite", "react"]
};

type ProjectStack = {
  frontend?: StackLayer;
  backend?: StackLayer;
  database?: StackLayer;
};
```

- Mỗi layer: **rule đầu tiên khớp** trong mảng rule (xem [DETECTION_RULES.md](./DETECTION_RULES.md)).
- `stackFrameworkSummary`: `frontend + backend` hoặc `"Node.js"`.
- `stackDatabaseSummary`: label database layer nếu có.

---

## 4. Scripts (logical keys)

```ts
type ScriptKey = "dev" | "build" | "test" | "lint" | "typecheck" | "format";

const SCRIPT_KEYS: ScriptKey[]; // thứ tự cố định
```

`pickCommonScripts(scripts)` → map `ScriptKey` → `{ scriptName, command }` (alias đầu tiên khớp).

`ctx.scripts` giữ **toàn bộ** scripts từ `package.json`; không bị filter.

---

## 5. Generated output

```ts
type GeneratedFiles = {
  "AGENTS.md": string;
  "PROJECT_CONTEXT.md": string;
  "COMMANDS.md": string;
  ".cursor/rules/agent-context-kit.mdc"?: string;
  "CLAUDE.md"?: string;
};

const OUTPUT_FILES = [
  "AGENTS.md",
  "PROJECT_CONTEXT.md",
  "COMMANDS.md",
  ".cursor/rules/agent-context-kit.mdc",
  "CLAUDE.md",
] as const;
type OutputFile = (typeof OUTPUT_FILES)[number];
```

**Sinh bởi:** `generateAllFiles(ctx)` — `generators/index.ts`.
Optional files are included when `init --cursor`, `init --claude`, or `init --all` is used.

Mỗi string có generated marker ở cuối file:

```ts
type GeneratedMarker = {
  file: OutputFile;
  hash: string; // first 16 hex chars of sha256(strippedContent)
};
```

Marker được xử lý bởi `generators/marker.ts`:

- `withGeneratedMarker(file, content)`
- `stripGeneratedMarker(content)`
- `readGeneratedMarker(content)`
- `hasGeneratedMarker(content, file)`

`hasGeneratedMarker` chỉ `true` khi marker tồn tại, `file` khớp output path, và `hash` khớp body hiện tại. Nếu user sửa body nhưng để nguyên marker cũ, file sẽ bị xem là `untracked`.

**Ghi bởi:** `writeGeneratedFiles(cwd, files, { force })` → `WriteResult`:

```ts
type WriteResult = {
  created: OutputFile[];
  overwritten: OutputFile[];
  skipped: OutputFile[];
};
```

**Dry-run:** `planWriteActions(cwd, force)` — không tạo `GeneratedFiles` trên disk.

### Update check model

`commands/update.ts` phân loại selected files bằng marker hợp lệ:

```ts
type UpdateCheckJsonOutput = {
  cwd: string;
  ok: boolean;
  upToDate: OutputFile[];
  outdated: OutputFile[];
  missing: OutputFile[];
  untracked: OutputFile[];
};
```

`ok === true` khi `outdated`, `missing`, và `untracked` đều rỗng.

Write mode của `update`:

- Tạo file `missing`.
- Overwrite file `outdated` nếu có marker đúng file.
- Skip file `untracked` trừ khi có `--force`.

---

## 6. Doctor model

```ts
type DoctorCheckStatus = "pass" | "warn" | "fail";

type DoctorCheck = {
  label: string;
  status: DoctorCheckStatus;
  detail?: string;
};

type DoctorResult = {
  checks: DoctorCheck[];
  passed: number;
  warned: number;
  failed: number;
  total: number;
};
```

**Tạo bởi:** `runDoctorChecks(cwd)` — `doctor/checks.ts`.

**Đếm:** `summarize(checks)` — mỗi check đóng góp đúng một bucket.

**Critical failure:** `hasCriticalFailure(result)` ⇔ `failed > 0`.

### JSON output (`doctor --json`)

CLI map `DoctorResult` → object in `formatDoctorJson()` (`commands/doctor.ts`):

```ts
{
  cwd: string;
  ok: boolean;  // !hasCriticalFailure(result)
  score: { passed, warned, failed, total };
  checks: DoctorCheck[];
}
```

Chi tiết FR: [REQUIREMENTS.md § FR-doctor-8](./REQUIREMENTS.md#fr-doctor-8--json-output).

### Fix output (`doctor --fix`)

`doctor --fix` dùng cùng marker/hash model với `update`:

- Missing selected files → create.
- Outdated generated files → overwrite.
- Up-to-date generated files → leave unchanged.
- Untracked files → skip unless `--force`.
- Critical doctor failure → fix does not run.

Khi có `--fix --json`, JSON doctor output có thêm `fix`:

```ts
type DoctorFixJsonOutput =
  | { ran: false; ok: false; reason: "critical-failure" }
  | {
      ran: true;
      mode: "dry-run";
      ok: true;
      upToDate: OutputFile[];
      wouldGenerate: OutputFile[];
      wouldOverwrite: OutputFile[];
      wouldSkipUntracked: OutputFile[];
    }
  | {
      ran: true;
      mode: "write";
      ok: boolean;
      created: OutputFile[];
      overwritten: OutputFile[];
      skippedUntracked: OutputFile[];
    };
```

---

## 7. Package manager resolution

```ts
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
type PackageManagerSource = "lockfile" | "package.json" | "fallback";

type ResolvedPackageManager = {
  manager: PackageManager;
  source: PackageManagerSource;
};
```

**Hàm:** `resolvePackageManager(cwd, packageManagerField?)`.

---

## 8. `PromptBrief` (lệnh `prompt`)

Nguồn truth: `src/prompt/types.ts`.

```ts
type PromptIntent =
  | "explain"
  | "review"
  | "fix"
  | "verify"
  | "clarify"
  | "general";

type PromptTarget = "auto" | "en" | "vi";

type PromptBrief = {
  source: PromptSource;
  target: PromptTarget;
  original: string;
  intent: PromptIntent;
  task: string;
  context: string[];
  requirements: string[];
  constraints: string[];
  verify: string[];
  unclear: string[];
  response: string[];
  stats: PromptStats;
};
```

**Luồng:** `readPromptInput` → `normalize` → `segment` → `classify` → `extract` → `render`.

**JSON CLI (`--json`):** `PromptJsonOutput` (có `target`, `intent`; không `source`, `original`, `stats`).

Chi tiết: [PROMPT_SPEC.md](./PROMPT_SPEC.md).

---

## 9. Validation errors (init)

`src/fs/validate.ts`:

| Hàm                              | Dùng khi                      |
| -------------------------------- | ----------------------------- |
| `validateCwd(cwd)`               | Directory tồn tại + là folder |
| `validatePackageJsonFile(cwd)`   | File package.json tồn tại     |
| `parsePackageJsonRaw(raw, path)` | Parse JSON + root object      |

`validateInitTarget` (read-project) gộp các bước trên cho `init`.

`doctor` duplicate logic cwd bằng `existsSync` + `statSync` (fail-fast, label riêng cho UX).

---

## 10. Public exports (`index.ts`)

| Export                                                           | Module                |
| ---------------------------------------------------------------- | --------------------- |
| `runInit`                                                        | `commands/init.js`    |
| `runDoctor`, `DoctorOptions`                                     | `commands/doctor.js`  |
| `runPrompt`, `buildPromptFromText`                               | `commands/prompt.js`  |
| `runUpdate`, `checkGeneratedFiles`, `writeUpdateFiles`           | `commands/update.js`  |
| `normalizePromptText`, `extractPromptBrief`, `renderPromptBrief` | `prompt/*`            |
| `runDoctorChecks`, `formatScore`, `hasCriticalFailure`           | `doctor/*`            |
| `readProject`, `resolveProjectCwd`, `validateInitTarget`         | `fs/read-project.js`  |
| `generateAllFiles`                                               | `generators/index.js` |
| Detectors                                                        | `detectors/*`         |
| Types                                                            | `types.js`            |

CLI không bắt buộc import `index.ts`; dùng `cli.ts` trực tiếp.

---

## 11. Không lưu trữ

- Không database / cache giữa lần chạy.
- Không file config user (`~/.agent-context-kit`).
- Không state trong memory ngoài một lần invoke CLI.
