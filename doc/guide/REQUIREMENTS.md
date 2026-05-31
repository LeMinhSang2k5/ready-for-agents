# Yêu cầu chức năng (Functional Requirements)

Phiên bản tài liệu: **v0.1.x** (đồng bộ với `package.json` version).

Ký hiệu trạng thái: **Done** = đã implement + có test; **Planned** = roadmap.

---

## FR-0 — Chung

| ID | Mô tả | Acceptance | Trạng thái |
|----|--------|------------|------------|
| FR-0-1 | CLI chạy trên Node.js 18+ | `engines.node >= 18` trong package | Done |
| FR-0-2 | Hỗ trợ `--cwd <path>` cho mọi lệnh project-scoped | Path resolve absolute; không nhận `cd/...` như path hợp lệ | Done |
| FR-0-3 | Không gọi network / AI API trong luồng chính | Không import SDK LLM; test offline | Done |

---

## FR-init — Lệnh `init`

| ID | Mô tả | Acceptance | Trạng thái |
|----|--------|------------|------------|
| FR-init-1 | Quét project và tạo `ProjectContext` | `readProject(cwd)` trả object đầy đủ khi có `package.json` hợp lệ | Done |
| FR-init-2 | Sinh đúng 3 file | `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md` | Done |
| FR-init-3 | Validate trước khi generate | Thiếu cwd / không phải directory / thiếu `package.json` / JSON lỗi → exit 1, message rõ | Done |
| FR-init-4 | `--dry-run` không ghi file | Sau chạy, `getExistingOutputFiles` không đổi | Done |
| FR-init-5 | Không ghi đè khi file đã tồn tại | Output `Skipped:` + gợi ý `--force` | Done |
| FR-init-6 | `--force` ghi đè file output | Output `Overwritten:` | Done |
| FR-init-7 | In summary Detected trên terminal | Project, PM, Framework, Database?, Scripts | Done |
| FR-init-8 | Dry-run in preview đầy đủ 3 file | Có separator và notice "Dry run" | Done |

---

## FR-doctor — Lệnh `doctor`

| ID | Mô tả | Acceptance | Trạng thái |
|----|--------|------------|------------|
| FR-doctor-1 | Không ghi/sửa file trên disk | Chỉ `readFileSync`/`existsSync`/`statSync` | Done |
| FR-doctor-2 | Dừng sớm khi cwd không tồn tại | `total === 1`, label `Project directory found`, detail `does not exist` | Done |
| FR-doctor-3 | Dừng sớm khi cwd không phải directory | `total === 1`, label `Project directory is a directory` | Done |
| FR-doctor-4 | 11 check khi cwd hợp lệ | Xem bảng [Doctor checks](#doctor-checks) | Done |
| FR-doctor-5 | In score line | `Score: P/T · W warnings · F failures` | Done |
| FR-doctor-6 | Exit 0 khi không có check `fail` | Cảnh warn vẫn exit 0 | Done |
| FR-doctor-7 | Exit 1 khi có ít nhất một `fail` | `hasCriticalFailure === true` | Done |
| FR-doctor-8 | Hỗ trợ `--json` cho CI | Xem [FR-doctor-8 — JSON output](#fr-doctor-8--json-output) | Done |

### FR-doctor-8 — JSON output

Khi `runDoctor({ json: true })` hoặc CLI `doctor --json`:

| Tiêu chí | Acceptance |
|----------|------------|
| Một object trên stdout | `JSON.parse(stdout)` thành công; không có dòng text khác |
| Không UI terminal | Không in `agent-context-kit doctor`, không màu (picocolors) |
| Field `cwd` | Đường dẫn đã `resolve()` (absolute) |
| Field `ok` | `true` iff không có check `fail` (cùng logic `hasCriticalFailure`) |
| Field `score` | `{ passed, warned, failed, total }` khớp `DoctorResult` |
| Field `checks` | Mảng `{ label, status, detail? }` giống chế độ text |
| Exit code | `0` khi `ok === true`; `1` khi `ok === false` |
| cwd sai (early exit) | JSON vẫn hợp lệ, `total === 1`, `ok === false` |

Schema tham chiếu: [CLI_SPEC.md](./CLI_SPEC.md#json-output).

### Doctor checks

| # | Label (tóm tắt) | pass | warn | fail |
|---|-----------------|------|------|------|
| 1 | Project directory found | cwd là directory | — | missing / not dir (early exit) |
| 2 | package.json found | có file | — | thiếu |
| 3 | package.json is valid JSON | parse OK | — | invalid / unreadable |
| 4 | Package manager detected | lockfile hoặc field | npm fallback only | — |
| 5–7 | AGENTS / PROJECT_CONTEXT / COMMANDS.md | có | thiếu | — |
| 8–10 | dev / build / test script | có trong scripts | thiếu | — |
| 11 | README.md | có (.md hoặc .MD) | thiếu | — |

---

## FR-detect — Phát hiện (dùng bởi `init`, một phần `doctor`)

| ID | Mô tả | Acceptance | Trạng thái |
|----|--------|------------|------------|
| FR-detect-1 | Package manager từ lockfile | Thứ tự file theo [DETECTION_RULES.md](./DETECTION_RULES.md) | Done |
| FR-detect-2 | PM từ field `packageManager` | Parse `name@version` | Done |
| FR-detect-3 | PM fallback npm | `source: "fallback"` khi không có tín hiệu | Done |
| FR-detect-4 | Stack multi-layer | frontend + backend + database độc lập | Done |
| FR-detect-5 | Script aliases | 6 `ScriptKey` map alias đầu tiên khớp | Done |
| FR-detect-6 | Related dev scripts | Parse `npm run` / `pnpm run` / … trong lệnh `dev` | Done |
| FR-detect-7 | Important folders | Chỉ check tên tại project root | Done |

---

## FR-planned — Roadmap

| ID | Mô tả | Trạng thái |
|----|--------|------------|
| FR-update-1 | `update` refresh context khi repo đổi | Planned |
| FR-gen-1 | Sinh `.cursor/rules`, `CLAUDE.md` | Planned |
| FR-lang-1 | Detect Python / FastAPI / Django | Planned |
| FR-ci-1 | GitHub Action đồng bộ context | Planned |
| FR-ai-1 | Tóm tắt tùy chọn bằng AI | Planned |

---

## Traceability (test)

| Nhóm FR | File test chính |
|---------|-----------------|
| FR-init | `tests/validation.test.ts`, `tests/init-safety.test.ts` |
| FR-doctor (gồm `--json`) | `tests/doctor.test.ts` — block `runDoctor --json` |
| FR-detect | `tests/detectors.test.ts`, `tests/package-manager.test.ts` |
| Generated output | `tests/generators.test.ts` |

Chi tiết: [TEST_STRATEGY.md](./TEST_STRATEGY.md).
