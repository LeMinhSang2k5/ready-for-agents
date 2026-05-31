# Đặc tả CLI

Binary: `agent-context-kit` (`dist/cli.js` sau build).

Framework CLI: [commander](https://github.com/tj/commander.js) v13.

---

## 1. Global

| Thuộc tính | Giá trị |
|------------|---------|
| `name` | `agent-context-kit` |
| `--version` / `-V` | Đọc từ `package.json` cạnh `dist/` |
| `--help` / `-h` | Help theo subcommand |

Không có global `--cwd`; mỗi subcommand tự khai báo.

---

## 2. Subcommand: `init`

**Mô tả:** Quét project và sinh file context Markdown.

### Options

| Flag | Kiểu | Mặc định | Mô tả |
|------|------|----------|--------|
| `--dry-run` | boolean | `false` | Preview; không `writeFileSync` |
| `--force` | boolean | `false` | Ghi đè file output đã tồn tại |
| `--cwd <path>` | string | `process.cwd()` | Thư mục project (resolve absolute) |

### Exit codes

| Code | Điều kiện |
|------|-----------|
| `0` | Thành công (kể cả skip hết file vì đã tồn tại) |
| `1` | `validateInitTarget` lỗi (cwd, package.json) |

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
agent-context-kit init --cwd /absolute/path/to/app --force
```

---

## 3. Subcommand: `doctor`

**Mô tả:** Kiểm tra project AI-agent-ready; không ghi file.

### Options

| Flag | Kiểu | Mặc định | Mô tả |
|------|------|----------|--------|
| `--cwd <path>` | string | `process.cwd()` | Thư mục project |
| `--json` | boolean | `false` | In JSON machine-readable cho CI |

Không có `--dry-run` / `--force`.

### Exit codes

| Code | Điều kiện |
|------|-----------|
| `0` | Không có check status `fail` (warn được phép) |
| `1` | `hasCriticalFailure` — ít nhất một `fail` |

### Output (stdout)

**Header:** `agent-context-kit doctor`

**Checks:** từng dòng với prefix 2 spaces:

| Status | Ký hiệu | Màu |
|--------|---------|-----|
| `pass` | `✓` | green |
| `warn` | `!` | yellow |
| `fail` | `✗` | red |

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
  ok: boolean; // true khi không có fail
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
};
```

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
agent-context-kit doctor --cwd /Users/you/projects/my-app
agent-context-kit doctor --json
```

---

## 4. Quy ước `--cwd`

| Đúng | Sai |
|------|-----|
| `/Users/you/app` | `cd/Users/you/app` |
| `./my-app` (resolve relative) | path không tồn tại (doctor/init báo lỗi) |

`path.resolve()` được gọi trong `runInit` / `runDoctor`.

---

## 5. Chạy trong development

| Lệnh | Tương đương |
|------|-------------|
| `pnpm dev init [opts]` | `tsx src/cli.ts init [opts]` |
| `pnpm start init [opts]` | `node dist/cli.js init [opts]` |
| `pnpm dev doctor [opts]` | `tsx src/cli.ts doctor [opts]` |

**pnpm:** `pnpm start doctor --cwd /path` — truyền args sau script `start` (không cần `--` trước `doctor`).

---

## 6. Programmatic API

Import từ package (xem [DATA_MODEL.md](./DATA_MODEL.md)):

```ts
import { runInit, runDoctor, runDoctorChecks } from "agent-context-kit";
```

`runInit` / `runDoctor` trả `Promise<number>` exit code; CLI gọi `process.exit(code)`.
