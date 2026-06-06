# Đặc tả CLI

Binary chính: `rfa` (`dist/cli.js` sau build).

Binary legacy: `ready-for-agents` vẫn được publish để tương thích với user đã cài bản cũ. Tài liệu, ví dụ và help text nên dùng `rfa` trước.

Framework CLI: [commander](https://github.com/tj/commander.js) v13.

---

## 1. Global

| Thuộc tính         | Giá trị                            |
| ------------------ | ---------------------------------- |
| `name`             | `rfa`                              |
| `--version` / `-V` | Đọc từ `package.json` cạnh `dist/` |
| `--help` / `-h`    | Help theo subcommand               |

Không có global `--cwd`; mỗi subcommand tự khai báo.

### Alias map

| Lệnh đầy đủ       | Alias     | Ghi chú                                      |
| ----------------- | --------- | -------------------------------------------- |
| `rfa init`        | `rfa i`   | Tạo context files                            |
| `rfa update`      | `rfa u`   | Refresh generated files                      |
| `rfa doctor`      | `rfa d`   | Kiểm tra readiness                           |
| `rfa diff`        | —         | So sánh generated context với project hiện tại |
| `rfa ci`          | —         | Tạo GitHub Actions workflow                  |
| `rfa prompt`      | `rfa p`   | Dạng ngắn có default `--context --compact`   |
| `rfa config`      | `rfa c`   | Nhóm lệnh config                             |
| `rfa config init` | `rfa c i` | Tạo `.ready-for-agents.json`                 |
| `rfa index`       | `rfa x`   | Build context tree                           |
| `rfa query`       | `rfa q`   | Chọn section context liên quan cho một task  |

---

## 2. Subcommand: `init`

**Mô tả:** Quét project và sinh file context Markdown.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                          |
| -------------- | ------- | --------------- | ---------------------------------------------- |
| `--dry-run`    | boolean | `false`         | Preview; không `writeFileSync`                 |
| `--force`      | boolean | `false`         | Ghi đè file output đã tồn tại                  |
| `--cursor`     | boolean | `false`         | Sinh thêm `.cursor/rules/ready-for-agents.mdc` |
| `--claude`     | boolean | `false`         | Sinh thêm `CLAUDE.md`                          |
| `--copilot`    | boolean | `false`         | Sinh thêm `.github/copilot-instructions.md`    |
| `--all`        | boolean | `false`         | Sinh toàn bộ file agent tùy chọn               |
| `--index`      | boolean | config          | Sinh `.ready-for-agents/context-tree.json`     |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project (resolve absolute)             |

Nếu `.ready-for-agents.json` tồn tại, `init` dùng `files.cursor`, `files.claude`, `files.copilot`, `files.all`, `files.index` làm default. Flag CLI được ưu tiên hơn config.

### Exit codes

| Code | Điều kiện                                      |
| ---- | ---------------------------------------------- |
| `0`  | Thành công (kể cả skip hết file vì đã tồn tại) |
| `1`  | `validateInitTarget` lỗi (cwd, package.json)   |

### Output (stdout)

**Header:** `rfa init` (bold qua picocolors)

**Block Detected:**

```text
Detected:
- Project: <name>
- Package manager: <label>
- Framework: <stackFrameworkDisplay>
- Database: <optional>
- Scripts: <comma-separated list>
```

**Dry-run thêm:**

- `Would generate:` / `Would overwrite:` / `Skipped:`
- Nội dung đầy đủ 3 file Markdown (separator `── filename ──`)
- Nếu index bật: thêm `.ready-for-agents/context-tree.json`
- Dòng `Dry run — no files written.`

**Ghi thật:**

- `Generated:` / `Overwritten:` / `Skipped:` (màu green/magenta/yellow)
- Nếu index bật: ghi context tree vào output path trong config.

**Stderr:** message đỏ khi validation fail.

### Ví dụ

```bash
rfa init
rfa init --dry-run
rfa init --cursor
rfa init --claude
rfa init --copilot
rfa init --all
rfa init --index
rfa init --cwd /absolute/path/to/app --force
```

---

## 3. Subcommand: `update`

**Mô tả:** Refresh các file context generated cho project. Mặc định chỉ overwrite file có marker do `ready-for-agents` sinh ra; file user tự viết được skip trừ khi có `--force`.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                                      |
| -------------- | ------- | --------------- | ---------------------------------------------------------- |
| `--dry-run`    | boolean | `false`         | Preview; không `writeFileSync`                             |
| `--check`      | boolean | `false`         | Kiểm tra selected files đã up to date chưa; không ghi file |
| `--json`       | boolean | `false`         | In JSON machine-readable cho CI; không ghi file            |
| `--force`      | boolean | `false`         | Ghi đè file existing không có generated marker             |
| `--cursor`     | boolean | `false`         | Refresh thêm `.cursor/rules/ready-for-agents.mdc`          |
| `--claude`     | boolean | `false`         | Refresh thêm `CLAUDE.md`                                   |
| `--copilot`    | boolean | `false`         | Refresh thêm `.github/copilot-instructions.md`             |
| `--all`        | boolean | `false`         | Refresh toàn bộ file agent tùy chọn                        |
| `--index`      | boolean | config          | Regenerate `.ready-for-agents/context-tree.json`           |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project (resolve absolute)                         |

Nếu `.ready-for-agents.json` tồn tại, `update` dùng `files.*` làm default. Flag CLI được ưu tiên hơn config.

### Exit codes

| Code | Điều kiện                                                        |
| ---- | ---------------------------------------------------------------- |
| `0`  | Thành công; hoặc `--check` thấy tất cả selected files up to date |
| `1`  | `validateInitTarget` lỗi (cwd, package.json)                     |
| `1`  | `--check` thấy file missing / outdated / untracked               |
| `1`  | Write mode skip ít nhất một untracked file                       |

### Update check JSON

Khi có `--check --json` hoặc `--json`, stdout chỉ chứa một JSON object:

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

Phân loại:

| Field       | Nghĩa                                                          |
| ----------- | -------------------------------------------------------------- |
| `upToDate`  | File tồn tại và nội dung khớp output hiện tại                  |
| `outdated`  | File tồn tại, có generated marker hợp lệ, nhưng nội dung đã cũ |
| `missing`   | File selected chưa tồn tại                                     |
| `untracked` | File tồn tại nhưng không có generated marker hợp lệ            |

`ok === true` khi cả `outdated`, `missing`, và `untracked` đều rỗng.

### Ví dụ

```bash
rfa update
rfa update --dry-run
rfa update --check
rfa update --check --json
rfa update --all
rfa update --copilot
rfa update --force
rfa update --cwd /absolute/path/to/app
```

---

## 4. Subcommand: `diff`

**Mô tả:** So sánh generated context files hiện tại với output mới dựa trên project state. Lệnh này không ghi file.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                          |
| -------------- | ------- | --------------- | ---------------------------------------------- |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project                                |
| `--json`       | boolean | `false`         | In JSON machine-readable cho CI                |
| `--cursor`     | boolean | config          | Include `.cursor/rules/ready-for-agents.mdc`   |
| `--claude`     | boolean | config          | Include `CLAUDE.md`                            |
| `--copilot`    | boolean | config          | Include `.github/copilot-instructions.md`      |
| `--all`        | boolean | config          | Include toàn bộ optional agent files           |

### Exit codes

| Code | Điều kiện                                          |
| ---- | -------------------------------------------------- |
| `0`  | Tất cả selected generated files đều current        |
| `1`  | Có file missing / outdated / untracked             |
| `1`  | `validateInitTarget` lỗi (cwd, package.json)       |

### JSON output

```ts
type DiffJsonOutput = {
  cwd: string;
  ok: boolean;
  upToDate: OutputFile[];
  outdated: OutputFile[];
  missing: OutputFile[];
  untracked: OutputFile[];
  diffs: Array<{ file: OutputFile; diff: string }>;
};
```

### Ví dụ

```bash
rfa diff
rfa diff --json
rfa diff --all
rfa diff --cwd /absolute/path/to/app
```

---

## 5. Subcommand: `ci`

**Mô tả:** Tạo `.github/workflows/ready-for-agents.yml` để GitHub Actions chạy readiness và context freshness checks.

Workflow generated chạy:

```bash
npx --package ready-for-agents rfa doctor --json --cwd .
npx --package ready-for-agents rfa diff --json --cwd .
```

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                 |
| -------------- | ------- | --------------- | ------------------------------------- |
| `--dry-run`    | boolean | `false`         | Preview workflow; không ghi file      |
| `--force`      | boolean | `false`         | Ghi đè workflow existing              |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project để tạo workflow       |

### Exit codes

| Code | Điều kiện                            |
| ---- | ------------------------------------ |
| `0`  | Thành công hoặc skip file existing   |
| `1`  | `validateCwd` lỗi                    |

### Ví dụ

```bash
rfa ci
rfa ci --dry-run
rfa ci --force
rfa ci --cwd /absolute/path/to/app
```

---

## 6. Subcommand: `doctor`

**Mô tả:** Kiểm tra project AI-agent-ready. Mặc định không ghi file; `--fix` có thể tạo/refresh context files an toàn.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                                       |
| -------------- | ------- | --------------- | ----------------------------------------------------------- |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project                                             |
| `--json`       | boolean | `false`         | In JSON machine-readable cho CI                             |
| `--fix`        | boolean | `false`         | Tạo file thiếu và refresh file generated đã cũ              |
| `--dry-run`    | boolean | `false`         | Với `--fix`, preview thay đổi và không ghi file             |
| `--force`      | boolean | `false`         | Với `--fix`, overwrite untracked existing files             |
| `--cursor`     | boolean | `false`         | Với `--fix`, include `.cursor/rules/ready-for-agents.mdc`   |
| `--claude`     | boolean | `false`         | Với `--fix`, include `CLAUDE.md`                            |
| `--copilot`    | boolean | `false`         | Với `--fix`, include `.github/copilot-instructions.md`      |
| `--all`        | boolean | `false`         | Với `--fix`, include toàn bộ optional agent files           |
| `--index`      | boolean | config          | Với `--fix`, generate `.ready-for-agents/context-tree.json` |

Nếu `.ready-for-agents.json` tồn tại, `doctor --fix` dùng `doctor.fix.*` kết hợp `files.*` làm default. Flag CLI được ưu tiên hơn config.

### Exit codes

| Code | Điều kiện                                                         |
| ---- | ----------------------------------------------------------------- |
| `0`  | Không có check status `fail` (warn được phép)                     |
| `0`  | `--fix --dry-run` preview thành công và không có critical failure |
| `0`  | `--fix` ghi được toàn bộ fixable generated files                  |
| `1`  | `hasCriticalFailure` — ít nhất một `fail`                         |
| `1`  | `--fix` skip ít nhất một untracked file                           |

### Output (stdout)

**Header:** `rfa doctor`

**Checks:** từng dòng với prefix 2 spaces:

| Status | Ký hiệu | Màu    |
| ------ | ------- | ------ |
| `pass` | `✓`     | green  |
| `warn` | `!`     | yellow |
| `fail` | `✗`     | red    |

Optional `detail` in dim parentheses: ` (detail text)`

**Score line (bold):**

```text
Score: <passed>/<total> · <warned> warning(s) · <failed> failure(s)
```

### JSON output

Khi có `--json`, stdout chỉ chứa **một JSON object** và không in header, màu terminal, check lines dạng text, hoặc score text.

Schema:

```ts
type DoctorJsonOutput = {
  cwd: string;
  ok: boolean; // true khi không có fail; với --fix còn yêu cầu fix ok
  score: {
    passed: number;
    warned: number;
    failed: number;
    total: number;
  };
  checks: Array<{
    label: string;
    status: "pass" | "warn" | "fail";
    detail?: string;
  }>;
  fix?: DoctorFixJsonOutput;
};
```

Khi dùng `--fix --json`, object có thêm `fix`:

```ts
type DoctorFixJsonOutput =
  | {
      ran: false;
      ok: false;
      reason: "critical-failure" | "config-error";
      error?: string;
    }
  | {
      ran: true;
      mode: "dry-run";
      ok: true;
      upToDate: OutputFile[];
      wouldGenerate: OutputFile[];
      wouldOverwrite: OutputFile[];
      wouldSkipUntracked: OutputFile[];
      wouldGenerateIndex?: string;
    }
  | {
      ran: true;
      mode: "write";
      ok: boolean;
      created: OutputFile[];
      overwritten: OutputFile[];
      skippedUntracked: OutputFile[];
      index?: { output: string; written: boolean };
    };
```

### Fix semantics

`doctor --fix` reuse generated marker/hash logic của `update`:

| Trạng thái                | Hành vi                                 |
| ------------------------- | --------------------------------------- |
| Missing selected file     | Generate                                |
| Outdated generated file   | Overwrite                               |
| Up-to-date generated file | Leave as-is                             |
| Untracked existing file   | Skip; dùng `--force` nếu muốn overwrite |
| Critical doctor failure   | Không chạy fix                          |

### Early exit (cwd invalid)

Chỉ in **một** check rồi score, ví dụ:

```text
Checks:
  ✗ Project directory found (/wrong/path does not exist)

Score: 0/1 · 0 warnings · 1 failure
```

### Ví dụ

```bash
rfa doctor
rfa doctor --fix --dry-run
rfa doctor --fix
rfa doctor --fix --json
rfa doctor --fix --index
rfa doctor --cwd /Users/you/projects/my-app
rfa doctor --json
```

---

## 7. Subcommand: `prompt` / `p`

**Mô tả:** Biến instruction thô thành prompt gọn, có cấu trúc, sẵn sàng cho agent — **không gọi AI API** (MVP).

> Turn rough instructions into compact, structured agent-ready prompts.

`p` là alias ngắn cho `prompt` với default `--context --compact`.

### Options (MVP)

| Flag                      | Kiểu    | Mặc định | Mô tả                                        |
| ------------------------- | ------- | -------- | -------------------------------------------- |
| `[text]`                  | string  | —        | Instruction (positional argument)            |
| `--stdin`                 | boolean | `false`  | Đọc instruction từ stdin (EOF = Ctrl+D)      |
| `--file <path>`           | string  | —        | Đọc instruction từ file                      |
| `--target <auto\|en\|vi>` | string  | config   | Chọn instruction ngôn ngữ cho phần response  |
| `--context`               | boolean | config   | Chèn relevant context từ context tree        |
| `--no-context`            | boolean | —        | Tắt relevant context lookup                  |
| `--compact`               | boolean | config   | Render prompt ngắn hơn                       |
| `--no-compact`            | boolean | —        | Ép style standard                            |
| `--context-limit <n>`     | number  | config   | Số section context tối đa                    |
| `--json`                  | boolean | `false`  | In JSON thay vì Markdown                     |
| `--stats`                 | boolean | `false`  | In thống kê độ dài ra stderr                 |
| `--cwd <path>`            | string  | cwd      | Thư mục dùng để đọc `.ready-for-agents.json` |

Nếu `--target`, `--context`, `--compact`, hoặc `--context-limit` không có, `prompt` dùng `prompt.*` trong config. Command `p` override default thành context + compact nếu config/flag không ghi đè.

**Planned:** `--ai`.

### Exit codes

| Code | Điều kiện                                  |
| ---- | ------------------------------------------ |
| `0`  | Có input hợp lệ sau normalize              |
| `1`  | Input rỗng / chỉ filler                    |
| `1`  | `--target` không thuộc `auto`, `en`, `vi`  |
| `1`  | `--context` bật nhưng `--cwd` không hợp lệ |

### Output Markdown (mặc định)

Sections: `## Task`, `## Context`, `## Requirements`, `## Constraints`, `## Verify`, `## Unclear / Needs Clarification`, `## Response` — chỉ in section không rỗng.

### JSON output

Khi `--json`, stdout chỉ chứa object:

```ts
type PromptJsonOutput = {
  target: "auto" | "en" | "vi";
  style: "standard" | "compact";
  intent: PromptIntent;
  task: string;
  relevantContext: PromptContextReference[];
  contextSource?: "cache" | "live";
  contextTreePath?: string;
  context: string[];
  requirements: string[];
  constraints: string[];
  verify: string[];
  unclear: string[];
  response: string[];
};
```

### Ví dụ

```bash
rfa prompt "kiểm tra doctor --json giúp tôi"
rfa prompt "kiểm tra doctor --json giúp tôi" --context --compact
rfa p "kiểm tra doctor --json giúp tôi"
rfa prompt --target en "sửa lỗi doctor --json giúp tôi"
rfa prompt --target vi "Explain what prompt does"
rfa prompt --stdin
echo "review api" | rfa prompt --stdin --json
rfa prompt --stats "fix login bug và chạy test"
rfa prompt --cwd /absolute/path/to/app "Explain this task"
```

`--target` là rule-based: flag này chỉ điều khiển instruction ngôn ngữ trong output, không gọi model dịch.

Chi tiết pipeline: [PROMPT_SPEC.md](./PROMPT_SPEC.md).

---

## 8. Subcommand: `config init`

**Mô tả:** Tạo file config project `.ready-for-agents.json`.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                |
| -------------- | ------- | --------------- | ------------------------------------ |
| `--dry-run`    | boolean | `false`         | Preview config; không ghi file       |
| `--force`      | boolean | `false`         | Ghi đè config đã tồn tại             |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project để tạo config tại đó |

### Config schema MVP

```ts
type ReadyForAgentsConfig = {
  $schema?: string;
  files?: {
    cursor?: boolean;
    claude?: boolean;
    copilot?: boolean;
    all?: boolean;
    index?: boolean;
  };
  doctor?: {
    fix?: {
      cursor?: boolean;
      claude?: boolean;
      copilot?: boolean;
      all?: boolean;
      force?: boolean;
      index?: boolean;
    };
  };
  prompt?: {
    target?: "auto" | "en" | "vi";
  };
  index?: {
    output?: string;
  };
};
```

Config primary: `.ready-for-agents.json`.

Tên legacy `.agent-context-kit.json` vẫn được đọc để tương thích, nhưng `config init` luôn tạo tên mới.

### Ví dụ

```bash
rfa config init
rfa config init --dry-run
rfa config init --force
rfa config init --cwd /absolute/path/to/app
```

---

## 9. Subcommand: `index`

**Mô tả:** Build context tree cache cho generated agent files.

### Options

| Flag              | Kiểu    | Mặc định              | Mô tả                                    |
| ----------------- | ------- | --------------------- | ---------------------------------------- |
| `--dry-run`       | boolean | `false`               | In metadata; không ghi file              |
| `--json`          | boolean | `false`               | In JSON machine-readable; không ghi file |
| `--output <path>` | string  | config `index.output` | Output path của context tree             |
| `--cwd <path>`    | string  | `process.cwd()`       | Thư mục project cần index                |

Default output: `.ready-for-agents/context-tree.json`.

### JSON output

```ts
type IndexJsonOutput = {
  ok: true;
  output: string;
  tree: ContextTree;
};
```

`ContextTree` gồm project metadata, summary tổng, danh sách generated files, file hash, heading sections, anchors, keywords, commands, summary ngắn, và token estimate.

### Ví dụ

```bash
rfa index
rfa index --dry-run
rfa index --json
rfa index --output .cache/agent-context-tree.json
rfa index --cwd /absolute/path/to/app
```

---

## 10. Subcommand: `query`

**Mô tả:** Chọn các section context liên quan nhất cho một task, dựa trên `.ready-for-agents/context-tree.json` khi có hoặc scan live các generated context files hiện tại.

### Options

| Flag            | Kiểu    | Mặc định              | Mô tả                                      |
| --------------- | ------- | --------------------- | ------------------------------------------ |
| `<text>`        | string  | required              | Task hoặc câu hỏi cần chọn context         |
| `--cwd <path>`  | string  | `process.cwd()`       | Thư mục project cần query                  |
| `--json`        | boolean | `false`               | In JSON machine-readable                   |
| `--limit <n>`   | number  | `6`                   | Số section tối đa, clamp trong khoảng 1-20 |
| `--tree <path>` | string  | config `index.output` | Path context tree muốn đọc                 |

### JSON output

```ts
type QueryJsonOutput =
  | {
      ok: true;
      cwd: string;
      query: string;
      source: "cache" | "live";
      treePath: string;
      summary: ContextTree["summary"];
      matches: QueryMatch[];
    }
  | {
      ok: false;
      cwd: string;
      query: string;
      error: string;
      matches: [];
    };
```

### Ví dụ

```bash
rfa query "how should I verify this change?"
rfa query "kiểm tra doctor hoạt động đúng chưa" --limit 4
rfa query "show stack and dependencies" --json
rfa query "fix build" --cwd /absolute/path/to/app
```

---

## 11. Quy ước `--cwd`

| Đúng                          | Sai                                      |
| ----------------------------- | ---------------------------------------- |
| `/Users/you/app`              | `cd/Users/you/app`                       |
| `./my-app` (resolve relative) | path không tồn tại (doctor/init báo lỗi) |

`path.resolve()` được gọi trong `runInit` / `runUpdate` / `runDiff` / `runDoctor` / `runCi` / `runIndex` / `runQuery` / `runConfigInit`.

---

## 12. Chạy trong development

| Lệnh                          | Tương đương                         |
| ----------------------------- | ----------------------------------- |
| `pnpm dev init [opts]`        | `tsx src/cli.ts init [opts]`        |
| `pnpm start init [opts]`      | `node dist/cli.js init [opts]`      |
| `pnpm dev update [opts]`      | `tsx src/cli.ts update [opts]`      |
| `pnpm dev diff [opts]`        | `tsx src/cli.ts diff [opts]`        |
| `pnpm dev ci [opts]`          | `tsx src/cli.ts ci [opts]`          |
| `pnpm dev doctor [opts]`      | `tsx src/cli.ts doctor [opts]`      |
| `pnpm dev prompt [opts]`      | `tsx src/cli.ts prompt [opts]`      |
| `pnpm dev index [opts]`       | `tsx src/cli.ts index [opts]`       |
| `pnpm dev query [opts]`       | `tsx src/cli.ts query [opts]`       |
| `pnpm dev config init [opts]` | `tsx src/cli.ts config init [opts]` |

**pnpm:** `pnpm start doctor --cwd /path` — truyền args sau script `start` (không cần `--` trước `doctor`).

---

## 13. Programmatic API

Import từ package (xem [DATA_MODEL.md](./DATA_MODEL.md)):

```ts
import {
  runInit,
  runUpdate,
  runDoctor,
  runIndex,
  runQuery,
  runConfigInit,
  runPrompt,
  buildPromptFromText,
} from "ready-for-agents";
```

`runInit` / `runUpdate` / `runDoctor` / `runIndex` / `runQuery` / `runConfigInit` / `runPrompt` trả `Promise<number>` exit code; CLI gọi `process.exit(code)`.
