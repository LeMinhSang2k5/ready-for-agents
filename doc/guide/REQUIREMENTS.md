# Yêu cầu chức năng (Functional Requirements)

Phiên bản tài liệu: **v0.2.x** (đồng bộ với `package.json` version).

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
| FR-init-9  | Sinh Cursor rules tùy chọn           | `init --cursor` tạo `.cursor/rules/ready-for-agents.mdc` an toàn                        | Done       |
| FR-init-10 | Sinh Claude guidance tùy chọn        | `init --claude` tạo `CLAUDE.md` an toàn                                                 | Done       |
| FR-init-11 | Sinh toàn bộ file agent tùy chọn     | `init --all` tạo Cursor rules + `CLAUDE.md` + Copilot instructions                      | Done       |
| FR-init-12 | Sinh context tree cache              | Khi index bật, tạo `.ready-for-agents/context-tree.json`; `--dry-run` không ghi cache   | Done       |
| FR-init-13 | Dùng config project                  | `.ready-for-agents.json` set default optional files / index; CLI flag override config   | Done       |
| FR-init-14 | Sinh Copilot instructions tùy chọn   | `init --copilot` tạo `.github/copilot-instructions.md` an toàn                          | Done       |

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
| FR-doctor-14 | `--fix` hỗ trợ context tree                       | Khi index bật, ghi `.ready-for-agents/context-tree.json`                | Done       |
| FR-doctor-15 | `--fix` dùng config                               | `doctor.fix.*` và `files.*` làm default; CLI flag override config       | Done       |

### FR-doctor-8 — JSON output

Khi `runDoctor({ json: true })` hoặc CLI `doctor --json`:

| Tiêu chí               | Acceptance                                                         |
| ---------------------- | ------------------------------------------------------------------ |
| Một object trên stdout | `JSON.parse(stdout)` thành công; không có dòng text khác           |
| Không UI terminal      | Không in `rfa doctor`, không màu (picocolors)         |
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
| `config-error`     | Config JSON lỗi → `fix.ran === false`, có `error`                        |
| Index fields       | Có `wouldGenerateIndex` hoặc `index` khi context tree được chọn          |
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
| FR-update-4  | Refresh optional agent files    | `update --all` overwrite Cursor rules + `CLAUDE.md` + Copilot instructions                              | Done       |
| FR-update-5  | Hỗ trợ `--cwd`                  | Cùng validation path với `init`                                                                         | Done       |
| FR-update-6  | Không ghi đè file user tự viết  | File tồn tại nhưng không có marker hợp lệ → `Skipped untracked`, exit 1                                 | Done       |
| FR-update-7  | `--force` ghi đè untracked file | User chủ động truyền `--force` thì overwrite file không có marker                                       | Done       |
| FR-update-8  | Generated marker/hash           | Mỗi output có marker `ready-for-agents:generated` kèm `file`; `hash` phải khớp body hiện tại            | Done       |
| FR-update-9  | `--check` cho CI                | Không ghi file; exit 0 nếu up to date, exit 1 nếu missing/outdated/untracked                            | Done       |
| FR-update-10 | `--json` machine-readable       | `JSON.parse(stdout)`; schema `UpdateCheckJsonOutput`; không in text terminal                            | Done       |
| FR-update-11 | Refresh context tree cache      | Khi index bật, regenerate `.ready-for-agents/context-tree.json`                                         | Done       |
| FR-update-12 | Dùng config project             | `.ready-for-agents.json` set default optional files / index; CLI flag override config                   | Done       |

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
| FR-prompt-14 | Dùng config target             | Nếu không có `--target`, đọc `prompt.target` từ `.ready-for-agents.json`              | Done       |
| FR-prompt-15 | `--context`                    | Chèn relevant context từ context tree/cache hoặc live scan                            | Done       |
| FR-prompt-16 | `--compact`                    | Render prompt ngắn hơn, giữ Task/Relevant Context/Verify chính                        | Done       |
| FR-prompt-17 | Alias `p`                      | `rfa p "..."` mặc định context + compact                                 | Done       |
| FR-prompt-18 | Binary alias `rfa`             | `rfa p "..."` gọi cùng CLI                                                            | Done       |
| FR-prompt-19 | Config context/compact         | `prompt.context`, `prompt.style`, `prompt.contextLimit` làm default                   | Done       |

**Không MVP:** dịch toàn bộ prompt bằng model, `--ai`. Xem [PROMPT_SPEC.md](./PROMPT_SPEC.md).

---

## FR-config — Lệnh `config init`

| ID          | Mô tả                       | Acceptance                                                                   | Trạng thái |
| ----------- | --------------------------- | ---------------------------------------------------------------------------- | ---------- |
| FR-config-1 | Tạo config project          | `config init` tạo `.ready-for-agents.json`                                   | Done       |
| FR-config-2 | `--dry-run` không ghi file  | Preview nội dung config, disk state không đổi                                | Done       |
| FR-config-3 | Không ghi đè mặc định       | Config tồn tại → output `Skipped`, không overwrite                           | Done       |
| FR-config-4 | `--force` ghi đè config     | Config tồn tại và có `--force` → overwrite                                   | Done       |
| FR-config-5 | Legacy config compatibility | Reader hỗ trợ `.agent-context-kit.json` nếu chưa có `.ready-for-agents.json` | Done       |

---

## FR-diff — Lệnh `diff`

| ID        | Mô tả                         | Acceptance                                                              | Trạng thái |
| --------- | ----------------------------- | ----------------------------------------------------------------------- | ---------- |
| FR-diff-1 | So sánh generated context     | Không ghi file; phân loại upToDate / outdated / missing / untracked    | Done       |
| FR-diff-2 | In text diff                  | File outdated có unified-style diff giữa current và generated output    | Done       |
| FR-diff-3 | `--json` machine-readable     | In `{ ok, upToDate, outdated, missing, untracked, diffs }`; không UI    | Done       |
| FR-diff-4 | Optional agent files          | `--cursor`, `--claude`, `--copilot`, `--all` chọn thêm optional files   | Done       |

---

## FR-ci — Lệnh `ci`

| ID      | Mô tả                          | Acceptance                                                              | Trạng thái |
| ------- | ------------------------------ | ----------------------------------------------------------------------- | ---------- |
| FR-ci-1 | Sinh GitHub Actions workflow   | `ci` tạo `.github/workflows/ready-for-agents.yml`                       | Done       |
| FR-ci-2 | `--dry-run` không ghi file     | Preview workflow content và giữ disk state                              | Done       |
| FR-ci-3 | Safe write                     | Không overwrite workflow existing nếu thiếu `--force`                   | Done       |
| FR-ci-4 | Workflow checks                | Workflow chạy `rfa doctor --json` và `rfa diff --json` bằng npm package | Done       |

---

## FR-index — Lệnh `index`

| ID         | Mô tả                      | Acceptance                                                                                                        | Trạng thái |
| ---------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-index-1 | Build context tree         | Output có `tool`, `project`, `summary`, `files`, `sections`, hashes, anchors, keywords, commands, token estimates | Done       |
| FR-index-2 | Default output path        | Ghi `.ready-for-agents/context-tree.json`                                                                         | Done       |
| FR-index-3 | `--dry-run` không ghi file | In metadata, disk state không đổi                                                                                 | Done       |
| FR-index-4 | `--json` machine-readable  | In `{ ok, output, tree }`, không ghi file                                                                         | Done       |
| FR-index-5 | Custom output path         | `--output <path>` hoặc config `index.output`                                                                      | Done       |

---

## FR-query — Lệnh `query`

| ID         | Mô tả                     | Acceptance                                                              | Trạng thái |
| ---------- | ------------------------- | ----------------------------------------------------------------------- | ---------- |
| FR-query-1 | Select relevant context   | Trả section refs, line ranges, summary, reasons, token estimates        | Done       |
| FR-query-2 | Dùng context tree cache   | Nếu `.ready-for-agents/context-tree.json` tồn tại thì `source: "cache"` | Done       |
| FR-query-3 | Live fallback             | Nếu cache chưa có thì scan live generated context files                 | Done       |
| FR-query-4 | `--json` machine-readable | In `{ ok, cwd, query, source, treePath, summary, matches }`             | Done       |
| FR-query-5 | Giới hạn section          | `--limit` giới hạn số match, clamp 1-20                                 | Done       |

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
| FR-ai-1      | Tóm tắt tùy chọn bằng AI         | Planned    |
| FR-prompt-10 | `--style`                        | Planned    |
| FR-prompt-13 | `--ai` rewrite opt-in            | Planned    |

---

## Traceability (test)

| Nhóm FR                           | File test chính                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| FR-init                           | `tests/validation.test.ts`, `tests/init-safety.test.ts`                                 |
| FR-update                         | `tests/update.test.ts`                                                                  |
| FR-diff / FR-ci                   | `tests/ci-diff.test.ts`                                                                 |
| FR-doctor (gồm `--json`, `--fix`) | `tests/doctor.test.ts` — blocks `runDoctor --json`, `runDoctor --fix`                   |
| FR-config / FR-index              | `tests/config-index.test.ts`                                                            |
| FR-detect                         | `tests/detectors.test.ts`, `tests/package-manager.test.ts`                              |
| Generated output                  | `tests/generators.test.ts`                                                              |
| FR-prompt                         | `tests/prompt.test.ts`, `tests/prompt-examples.test.ts`, `tests/prompt-quality.test.ts` |

Chi tiết: [TEST_STRATEGY.md](./TEST_STRATEGY.md).
