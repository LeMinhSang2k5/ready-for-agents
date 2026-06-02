# Yêu cầu chức năng (Functional Requirements)

Phiên bản tài liệu: **v0.1.x** (đồng bộ với `package.json` version).

Ký hiệu trạng thái: **Done** = đã implement + có test; **Planned** = roadmap.

---

## FR-0 — Chung

| ID     | Mô tả                                             | Acceptance                                                 | Trạng thái |
| ------ | ------------------------------------------------- | ---------------------------------------------------------- | ---------- |
| FR-0-1 | CLI chạy trên Node.js 18+                         | `engines.node >= 18` trong package                         | Done       |
| FR-0-2 | Hỗ trợ `--cwd <path>` cho mọi lệnh project-scoped | Path resolve absolute; không nhận `cd/...` như path hợp lệ | Done       |
| FR-0-3 | Không gọi network / AI API trong luồng chính      | Không import SDK LLM; test offline                         | Done       |

---

## FR-init — Lệnh `init`

| ID         | Mô tả                                | Acceptance                                                                              | Trạng thái |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------------------- | ---------- |
| FR-init-1  | Quét project và tạo `ProjectContext` | `readProject(cwd)` trả object đầy đủ khi có `package.json` hợp lệ                       | Done       |
| FR-init-2  | Sinh đúng 3 file                     | `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md`                                        | Done       |
| FR-init-3  | Validate trước khi generate          | Thiếu cwd / không phải directory / thiếu `package.json` / JSON lỗi → exit 1, message rõ | Done       |
| FR-init-4  | `--dry-run` không ghi file           | Sau chạy, `getExistingOutputFiles` không đổi                                            | Done       |
| FR-init-5  | Không ghi đè khi file đã tồn tại     | Output `Skipped:` + gợi ý `--force`                                                     | Done       |
| FR-init-6  | `--force` ghi đè file output         | Output `Overwritten:`                                                                   | Done       |
| FR-init-7  | In summary Detected trên terminal    | Project, PM, Framework, Database?, Scripts                                              | Done       |
| FR-init-8  | Dry-run in preview đầy đủ 3 file     | Có separator và notice "Dry run"                                                        | Done       |
| FR-init-9  | Sinh Cursor rules tùy chọn           | `init --cursor` tạo `.cursor/rules/agent-context-kit.mdc` an toàn                       | Done       |
| FR-init-10 | Sinh Claude guidance tùy chọn        | `init --claude` tạo `CLAUDE.md` an toàn                                                 | Done       |
| FR-init-11 | Sinh toàn bộ file agent tùy chọn     | `init --all` tạo Cursor rules + `CLAUDE.md`                                             | Done       |

---

## FR-doctor — Lệnh `doctor`

| ID           | Mô tả                                             | Acceptance                                                              | Trạng thái |
| ------------ | ------------------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| FR-doctor-1  | Không ghi/sửa file trên disk khi không có `--fix` | Chỉ `readFileSync`/`existsSync`/`statSync` ở mode check-only            | Done       |
| FR-doctor-2  | Dừng sớm khi cwd không tồn tại                    | `total === 1`, label `Project directory found`, detail `does not exist` | Done       |
| FR-doctor-3  | Dừng sớm khi cwd không phải directory             | `total === 1`, label `Project directory is a directory`                 | Done       |
| FR-doctor-4  | 11 check khi cwd hợp lệ                           | Xem bảng [Doctor checks](#doctor-checks)                                | Done       |
| FR-doctor-5  | In score line                                     | `Score: P/T · W warnings · F failures`                                  | Done       |
| FR-doctor-6  | Exit 0 khi không có check `fail`                  | Cảnh warn vẫn exit 0                                                    | Done       |
| FR-doctor-7  | Exit 1 khi có ít nhất một `fail`                  | `hasCriticalFailure === true`                                           | Done       |
| FR-doctor-8  | Hỗ trợ `--json` cho CI                            | Xem [FR-doctor-8 — JSON output](#fr-doctor-8--json-output)              | Done       |
| FR-doctor-9  | Hỗ trợ `--fix`                                    | Tạo missing context files, refresh outdated generated files             | Done       |
| FR-doctor-10 | `--fix --dry-run` không ghi file                  | In fix preview; disk state không đổi                                    | Done       |
| FR-doctor-11 | `--fix` bảo vệ untracked files                    | Skip file không có marker hợp lệ, exit 1                                | Done       |
| FR-doctor-12 | `--fix --json` machine-readable                   | JSON có field `fix`, không in text terminal                             | Done       |
| FR-doctor-13 | Critical failure không chạy fix                   | Missing/invalid `package.json` → fix skipped, exit 1                    | Done       |

### FR-doctor-8 — JSON output

Khi `runDoctor({ json: true })` hoặc CLI `doctor --json`:

| Tiêu chí               | Acceptance                                                         |
| ---------------------- | ------------------------------------------------------------------ |
| Một object trên stdout | `JSON.parse(stdout)` thành công; không có dòng text khác           |
| Không UI terminal      | Không in `agent-context-kit doctor`, không màu (picocolors)        |
| Field `cwd`            | Đường dẫn đã `resolve()` (absolute)                                |
| Field `ok`             | `true` iff không có check `fail` (cùng logic `hasCriticalFailure`) |
| Field `score`          | `{ passed, warned, failed, total }` khớp `DoctorResult`            |
| Field `checks`         | Mảng `{ label, status, detail? }` giống chế độ text                |
| Exit code              | `0` khi `ok === true`; `1` khi `ok === false`                      |
| cwd sai (early exit)   | JSON vẫn hợp lệ, `total === 1`, `ok === false`                     |

Schema tham chiếu: [CLI_SPEC.md](./CLI_SPEC.md#json-output).

### FR-doctor-12 — `--fix --json` output

Khi `runDoctor({ fix: true, json: true })` hoặc CLI `doctor --fix --json`:

| Tiêu chí           | Acceptance                                                               |
| ------------------ | ------------------------------------------------------------------------ |
| Field `fix.ran`    | `true` nếu không có critical failure; `false` nếu fix bị skip            |
| `mode: "write"`    | Có `created`, `overwritten`, `skippedUntracked`                          |
| `mode: "dry-run"`  | Có `wouldGenerate`, `wouldOverwrite`, `wouldSkipUntracked`, `upToDate`   |
| `critical-failure` | `fix: { ran: false, ok: false, reason: "critical-failure" }`             |
| Exit code          | `0` khi doctor không critical và fix không skip untracked; `1` ngược lại |

### Doctor checks

| #    | Label (tóm tắt)                        | pass                | warn              | fail                           |
| ---- | -------------------------------------- | ------------------- | ----------------- | ------------------------------ |
| 1    | Project directory found                | cwd là directory    | —                 | missing / not dir (early exit) |
| 2    | package.json found                     | có file             | —                 | thiếu                          |
| 3    | package.json is valid JSON             | parse OK            | —                 | invalid / unreadable           |
| 4    | Package manager detected               | lockfile hoặc field | npm fallback only | —                              |
| 5–7  | AGENTS / PROJECT_CONTEXT / COMMANDS.md | có                  | thiếu             | —                              |
| 8–10 | dev / build / test script              | có trong scripts    | thiếu             | —                              |
| 11   | README.md                              | có (.md hoặc .MD)   | thiếu             | —                              |

---

## FR-update — Lệnh `update`

| ID           | Mô tả                           | Acceptance                                                                                              | Trạng thái |
| ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| FR-update-1  | Refresh 3 file core generated   | `update` overwrite `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md` khi file có generated marker hợp lệ | Done       |
| FR-update-2  | Preview không ghi file          | `update --dry-run` in would overwrite/create và giữ disk state                                          | Done       |
| FR-update-3  | Tạo file core nếu thiếu         | Project hợp lệ nhưng chưa có context files vẫn tạo được                                                 | Done       |
| FR-update-4  | Refresh optional agent files    | `update --all` overwrite Cursor rules + `CLAUDE.md`                                                     | Done       |
| FR-update-5  | Hỗ trợ `--cwd`                  | Cùng validation path với `init`                                                                         | Done       |
| FR-update-6  | Không ghi đè file user tự viết  | File tồn tại nhưng không có marker hợp lệ → `Skipped untracked`, exit 1                                 | Done       |
| FR-update-7  | `--force` ghi đè untracked file | User chủ động truyền `--force` thì overwrite file không có marker                                       | Done       |
| FR-update-8  | Generated marker/hash           | Mỗi output có marker `agent-context-kit:generated` kèm `file`; `hash` phải khớp body hiện tại           | Done       |
| FR-update-9  | `--check` cho CI                | Không ghi file; exit 0 nếu up to date, exit 1 nếu missing/outdated/untracked                            | Done       |
| FR-update-10 | `--json` machine-readable       | `JSON.parse(stdout)`; schema `UpdateCheckJsonOutput`; không in text terminal                            | Done       |

### FR-update-10 — JSON output

Khi `runUpdate({ check: true, json: true })`, CLI `update --check --json`, hoặc `update --json`:

| Tiêu chí               | Acceptance                                               |
| ---------------------- | -------------------------------------------------------- |
| Một object trên stdout | `JSON.parse(stdout)` thành công; không có dòng text khác |
| Field `cwd`            | Đường dẫn target absolute                                |
| Field `ok`             | `true` iff `outdated`, `missing`, `untracked` đều rỗng   |
| Field `upToDate`       | Selected files tồn tại và khớp output hiện tại           |
| Field `outdated`       | Selected files có marker hợp lệ nhưng nội dung đã cũ     |
| Field `missing`        | Selected files chưa tồn tại                              |
| Field `untracked`      | Selected files tồn tại nhưng không có marker hợp lệ      |
| Exit code              | `0` khi `ok === true`; `1` khi `ok === false`            |

---

## FR-prompt — Lệnh `prompt`

| ID           | Mô tả                          | Acceptance                                                                            | Trạng thái |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------- | ---------- |
| FR-prompt-11 | Input từ file                  | `prompt --file task.txt`                                                              | Done       |
| FR-prompt-12 | Interactive mode khi TTY       | Hỏi và đọc từ stdin                                                                   | Done       |
| FR-prompt-1  | Không gọi AI API               | Chỉ normalize + extract + render tĩnh                                                 | Done       |
| FR-prompt-2  | Input từ argument              | `prompt "text"`                                                                       | Done       |
| FR-prompt-3  | Input từ stdin                 | `prompt --stdin`                                                                      | Done       |
| FR-prompt-4  | Normalize conservative         | Bỏ filler nhẹ; giữ nghĩa kỹ thuật                                                     | Done       |
| FR-prompt-5  | Output Markdown có cấu trúc    | Task, Context, Requirements, Constraints, Verify, Unclear, Response (bỏ section rỗng) | Done       |
| FR-prompt-6  | `--json` machine-readable      | `JSON.parse(stdout)`; schema `PromptJsonOutput`                                       | Done       |
| FR-prompt-7  | Exit 1 khi input rỗng          | Sau normalize không còn nội dung                                                      | Done       |
| FR-prompt-8  | Giảm độ dài input filler-heavy | Output ngắn hơn input gốc (test)                                                      | Done       |
| FR-prompt-9  | `--target auto\|en\|vi`        | Điều khiển instruction ngôn ngữ trong Response; invalid target exit 1                 | Done       |

**Không MVP:** dịch toàn bộ prompt bằng model, `--ai`. Xem [PROMPT_SPEC.md](./PROMPT_SPEC.md).

---

## FR-detect — Phát hiện (dùng bởi `init`, một phần `doctor`)

| ID          | Mô tả                        | Acceptance                                                  | Trạng thái |
| ----------- | ---------------------------- | ----------------------------------------------------------- | ---------- |
| FR-detect-1 | Package manager từ lockfile  | Thứ tự file theo [DETECTION_RULES.md](./DETECTION_RULES.md) | Done       |
| FR-detect-2 | PM từ field `packageManager` | Parse `name@version`                                        | Done       |
| FR-detect-3 | PM fallback npm              | `source: "fallback"` khi không có tín hiệu                  | Done       |
| FR-detect-4 | Stack multi-layer            | frontend + backend + database độc lập                       | Done       |
| FR-detect-5 | Script aliases               | 6 `ScriptKey` map alias đầu tiên khớp                       | Done       |
| FR-detect-6 | Related dev scripts          | Parse `npm run` / `pnpm run` / … trong lệnh `dev`           | Done       |
| FR-detect-7 | Important folders            | Chỉ check tên tại project root                              | Done       |

---

## FR-planned — Roadmap

| ID           | Mô tả                            | Trạng thái |
| ------------ | -------------------------------- | ---------- |
| FR-lang-1    | Detect Python / FastAPI / Django | Planned    |
| FR-ci-1      | GitHub Action đồng bộ context    | Planned    |
| FR-ai-1      | Tóm tắt tùy chọn bằng AI         | Planned    |
| FR-prompt-10 | `--style`                        | Planned    |
| FR-prompt-13 | `--ai` rewrite opt-in            | Planned    |

---

## Traceability (test)

| Nhóm FR                           | File test chính                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| FR-init                           | `tests/validation.test.ts`, `tests/init-safety.test.ts`                                 |
| FR-update                         | `tests/update.test.ts`                                                                  |
| FR-doctor (gồm `--json`, `--fix`) | `tests/doctor.test.ts` — blocks `runDoctor --json`, `runDoctor --fix`                   |
| FR-detect                         | `tests/detectors.test.ts`, `tests/package-manager.test.ts`                              |
| Generated output                  | `tests/generators.test.ts`                                                              |
| FR-prompt                         | `tests/prompt.test.ts`, `tests/prompt-examples.test.ts`, `tests/prompt-quality.test.ts` |

Chi tiết: [TEST_STRATEGY.md](./TEST_STRATEGY.md).
