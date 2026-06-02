# Đặc tả CLI

Binary: `agent-context-kit` (`dist/cli.js` sau build).

Framework CLI: [commander](https://github.com/tj/commander.js) v13.

---

## 1. Global

| Thuộc tính         | Giá trị                            |
| ------------------ | ---------------------------------- |
| `name`             | `agent-context-kit`                |
| `--version` / `-V` | Đọc từ `package.json` cạnh `dist/` |
| `--help` / `-h`    | Help theo subcommand               |

Không có global `--cwd`; mỗi subcommand tự khai báo.

---

## 2. Subcommand: `init`

**Mô tả:** Quét project và sinh file context Markdown.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                           |
| -------------- | ------- | --------------- | ----------------------------------------------- |
| `--dry-run`    | boolean | `false`         | Preview; không `writeFileSync`                  |
| `--force`      | boolean | `false`         | Ghi đè file output đã tồn tại                   |
| `--cursor`     | boolean | `false`         | Sinh thêm `.cursor/rules/agent-context-kit.mdc` |
| `--claude`     | boolean | `false`         | Sinh thêm `CLAUDE.md`                           |
| `--all`        | boolean | `false`         | Sinh toàn bộ file agent tùy chọn                |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project (resolve absolute)              |

### Exit codes

| Code | Điều kiện                                      |
| ---- | ---------------------------------------------- |
| `0`  | Thành công (kể cả skip hết file vì đã tồn tại) |
| `1`  | `validateInitTarget` lỗi (cwd, package.json)   |

### Output (stdout)

**Header:** `agent-context-kit` (bold qua picocolors)

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
- Dòng `Dry run — no files written.`

**Ghi thật:**

- `Generated:` / `Overwritten:` / `Skipped:` (màu green/magenta/yellow)

**Stderr:** message đỏ khi validation fail.

### Ví dụ

```bash
agent-context-kit init
agent-context-kit init --dry-run
agent-context-kit init --cursor
agent-context-kit init --claude
agent-context-kit init --all
agent-context-kit init --cwd /absolute/path/to/app --force
```

---

## 3. Subcommand: `update`

**Mô tả:** Refresh các file context generated cho project. Mặc định chỉ overwrite file có marker do `agent-context-kit` sinh ra; file user tự viết được skip trừ khi có `--force`.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                                      |
| -------------- | ------- | --------------- | ---------------------------------------------------------- |
| `--dry-run`    | boolean | `false`         | Preview; không `writeFileSync`                             |
| `--check`      | boolean | `false`         | Kiểm tra selected files đã up to date chưa; không ghi file |
| `--json`       | boolean | `false`         | In JSON machine-readable cho CI; không ghi file            |
| `--force`      | boolean | `false`         | Ghi đè file existing không có generated marker             |
| `--cursor`     | boolean | `false`         | Refresh thêm `.cursor/rules/agent-context-kit.mdc`         |
| `--claude`     | boolean | `false`         | Refresh thêm `CLAUDE.md`                                   |
| `--all`        | boolean | `false`         | Refresh toàn bộ file agent tùy chọn                        |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project (resolve absolute)                         |

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
agent-context-kit update
agent-context-kit update --dry-run
agent-context-kit update --check
agent-context-kit update --check --json
agent-context-kit update --all
agent-context-kit update --force
agent-context-kit update --cwd /absolute/path/to/app
```

---

## 4. Subcommand: `doctor`

**Mô tả:** Kiểm tra project AI-agent-ready. Mặc định không ghi file; `--fix` có thể tạo/refresh context files an toàn.

### Options

| Flag           | Kiểu    | Mặc định        | Mô tả                                                      |
| -------------- | ------- | --------------- | ---------------------------------------------------------- |
| `--cwd <path>` | string  | `process.cwd()` | Thư mục project                                            |
| `--json`       | boolean | `false`         | In JSON machine-readable cho CI                            |
| `--fix`        | boolean | `false`         | Tạo file thiếu và refresh file generated đã cũ             |
| `--dry-run`    | boolean | `false`         | Với `--fix`, preview thay đổi và không ghi file            |
| `--force`      | boolean | `false`         | Với `--fix`, overwrite untracked existing files            |
| `--cursor`     | boolean | `false`         | Với `--fix`, include `.cursor/rules/agent-context-kit.mdc` |
| `--claude`     | boolean | `false`         | Với `--fix`, include `CLAUDE.md`                           |
| `--all`        | boolean | `false`         | Với `--fix`, include toàn bộ optional agent files          |

### Exit codes

| Code | Điều kiện                                                         |
| ---- | ----------------------------------------------------------------- |
| `0`  | Không có check status `fail` (warn được phép)                     |
| `0`  | `--fix --dry-run` preview thành công và không có critical failure |
| `0`  | `--fix` ghi được toàn bộ fixable generated files                  |
| `1`  | `hasCriticalFailure` — ít nhất một `fail`                         |
| `1`  | `--fix` skip ít nhất một untracked file                           |

### Output (stdout)

**Header:** `agent-context-kit doctor`

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
agent-context-kit doctor
agent-context-kit doctor --fix --dry-run
agent-context-kit doctor --fix
agent-context-kit doctor --fix --json
agent-context-kit doctor --cwd /Users/you/projects/my-app
agent-context-kit doctor --json
```

---

## 5. Subcommand: `prompt`

**Mô tả:** Biến instruction thô thành prompt gọn, có cấu trúc, sẵn sàng cho agent — **không gọi AI API** (MVP).

> Turn rough instructions into compact, structured agent-ready prompts.

### Options (MVP)

| Flag                      | Kiểu    | Mặc định | Mô tả                                       |
| ------------------------- | ------- | -------- | ------------------------------------------- |
| `[text]`                  | string  | —        | Instruction (positional argument)           |
| `--stdin`                 | boolean | `false`  | Đọc instruction từ stdin (EOF = Ctrl+D)     |
| `--file <path>`           | string  | —        | Đọc instruction từ file                     |
| `--target <auto\|en\|vi>` | string  | `auto`   | Chọn instruction ngôn ngữ cho phần response |
| `--json`                  | boolean | `false`  | In JSON thay vì Markdown                    |
| `--stats`                 | boolean | `false`  | In thống kê độ dài ra stderr                |

**Planned:** `--style`, `--ai`.

### Exit codes

| Code | Điều kiện                                 |
| ---- | ----------------------------------------- |
| `0`  | Có input hợp lệ sau normalize             |
| `1`  | Input rỗng / chỉ filler                   |
| `1`  | `--target` không thuộc `auto`, `en`, `vi` |

### Output Markdown (mặc định)

Sections: `## Task`, `## Context`, `## Requirements`, `## Constraints`, `## Verify`, `## Unclear / Needs Clarification`, `## Response` — chỉ in section không rỗng.

### JSON output

Khi `--json`, stdout chỉ chứa object:

```ts
type PromptJsonOutput = {
  target: "auto" | "en" | "vi";
  intent: PromptIntent;
  task: string;
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
agent-context-kit prompt "kiểm tra doctor --json giúp tôi"
agent-context-kit prompt --target en "sửa lỗi doctor --json giúp tôi"
agent-context-kit prompt --target vi "Explain what prompt does"
agent-context-kit prompt --stdin
echo "review api" | agent-context-kit prompt --stdin --json
agent-context-kit prompt --stats "fix login bug và chạy test"
```

`--target` là rule-based: flag này chỉ điều khiển instruction ngôn ngữ trong output, không gọi model dịch.

Chi tiết pipeline: [PROMPT_SPEC.md](./PROMPT_SPEC.md).

---

## 6. Quy ước `--cwd`

| Đúng                          | Sai                                      |
| ----------------------------- | ---------------------------------------- |
| `/Users/you/app`              | `cd/Users/you/app`                       |
| `./my-app` (resolve relative) | path không tồn tại (doctor/init báo lỗi) |

`path.resolve()` được gọi trong `runInit` / `runUpdate` / `runDoctor`.

---

## 7. Chạy trong development

| Lệnh                     | Tương đương                    |
| ------------------------ | ------------------------------ |
| `pnpm dev init [opts]`   | `tsx src/cli.ts init [opts]`   |
| `pnpm start init [opts]` | `node dist/cli.js init [opts]` |
| `pnpm dev update [opts]` | `tsx src/cli.ts update [opts]` |
| `pnpm dev doctor [opts]` | `tsx src/cli.ts doctor [opts]` |
| `pnpm dev prompt [opts]` | `tsx src/cli.ts prompt [opts]` |

**pnpm:** `pnpm start doctor --cwd /path` — truyền args sau script `start` (không cần `--` trước `doctor`).

---

## 8. Programmatic API

Import từ package (xem [DATA_MODEL.md](./DATA_MODEL.md)):

```ts
import {
  runInit,
  runUpdate,
  runDoctor,
  runPrompt,
  buildPromptFromText,
} from "agent-context-kit";
```

`runInit` / `runUpdate` / `runDoctor` / `runPrompt` trả `Promise<number>` exit code; CLI gọi `process.exit(code)`.
