# Chiến lược kiểm thử (Test Strategy)

Runner: **Vitest** (`pnpm test`).

Hiện tại: **279 tests** trong 15 file (cập nhật khi thêm test).

---

## 1. Mục tiêu

| Mục tiêu                | Cách đạt                                                              |
| ----------------------- | --------------------------------------------------------------------- |
| Khóa behavior FR        | Map test ↔ [REQUIREMENTS.md](./REQUIREMENTS.md)                       |
| Bảo vệ detect rules     | `detectors.test.ts`, `package-manager.test.ts`                        |
| An toàn ghi file        | `init-safety.test.ts`                                                 |
| Doctor contract         | `doctor.test.ts` (text + `--json` + `--fix`)                          |
| CI machine-readable     | `doctor.test.ts`, `ci-diff.test.ts` → JSON outputs                    |
| Validation init         | `validation.test.ts`                                                  |
| Update contract         | `update.test.ts` (`--check`, `--json`, marker/untracked safety)       |
| Config/index/query      | `config-index.test.ts`, `query.test.ts`                               |
| CI/diff contract        | `ci-diff.test.ts`                                                     |
| CLI entrypoint          | `cli.test.ts`                                                         |
| Format output Markdown  | `generators.test.ts`                                                  |
| Prompt pipeline (no AI) | `prompt.test.ts`, `prompt-examples.test.ts`, `prompt-quality.test.ts` |

**Không** mục tiêu (hiện tại): coverage % bắt buộc, E2E CLI subprocess, snapshot toàn file Markdown.

---

## 2. Phân lớp test

```text
┌─────────────────────────────────────┐
│  Integration-ish (runInit stdout)   │  validation.test.ts
├─────────────────────────────────────┤
│  Component (init write/dry-run)     │  init-safety.test.ts
├─────────────────────────────────────┤
│  Component (config/index/query)     │  config-index.test.ts, query.test.ts
├─────────────────────────────────────┤
│  Component (ci/diff)                │  ci-diff.test.ts
├─────────────────────────────────────┤
│  Unit (detectors, doctor, PM)       │  detectors, doctor, package-manager
├─────────────────────────────────────┤
│  Generator output contract          │  generators.test.ts
└─────────────────────────────────────┘
```

---

## 3. File test ↔ phạm vi

| File                      | Số test ~ | Phạm vi                                                                                                              |
| ------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `doctor.test.ts`          | 19        | `runDoctorChecks`, `formatScore`, `hasCriticalFailure`, cwd early exit, `--json`, `--fix`                            |
| `validation.test.ts`      | 7         | `runInit` validation, dry-run không ghi                                                                              |
| `init-safety.test.ts`     | 18        | skip/force/overwrite, dry-run plan, optional Cursor/Claude/Copilot files                                             |
| `update.test.ts`          | 9         | update marker/hash safety, `--force`, dry-run, missing files, optional Cursor/Claude/Copilot refresh, `--check --json` |
| `ci-diff.test.ts`         | 5         | `ci` workflow dry-run/write safety, `diff` current/stale/json behavior                                               |
| `cli.test.ts`             | 10        | canonical `rfa` help output and command/alias help                                                                  |
| `config-index.test.ts`    | 9         | `config init`, legacy config read, config defaults, prompt target config, `index` write/dry-run/json                 |
| `query.test.ts`           | 3         | live context selection, cached tree `--json`, empty query validation                                                 |
| `detectors.test.ts`       | 16        | stack, scripts, related scripts, labels                                                                              |
| `package-manager.test.ts` | 5         | lockfile priority, field parse, fallback                                                                             |
| `generators.test.ts`      | 6         | AGENTS spacing, COMMANDS fallback label, trailing newline, optional agent generators, CI workflow marker             |
| `prompt.test.ts`          | 27        | segment, classify, explain/clarify/review, sections, JSON schema, input source validation, `--target`, stats wording |
| `prompt-context.test.ts`  | 3         | `prompt --context --compact`, JSON `relevantContext`, config context/style defaults                                  |
| `prompt-examples.test.ts` | 131       | bilingual/mixed prompt example suite for intent classification                                                       |
| `prompt-quality.test.ts`  | 11        | output quality signals: task, requirements, verify, unclear, constraints                                             |

---

## 4. Fixture pattern

### 4.1 `makeFixture` (doctor)

```ts
mkdtempSync(join(tmpdir(), `ack-doctor-${name}-`));
// write files với mkdirSync(dirname(full))
// afterEach: rmSync recursive
```

### 4.2 Init tests

Tương tự temp dir hoặc mock cwd; kiểm tra disk state sau `runInit`.

### 4.3 Missing cwd (doctor)

`join(tmpdir(), \`missing-ready-for-agents-${randomUUID()}\`)` — tránh collision.

---

## 5. Case bắt buộc (doctor)

| Case                          | Expect                                                  |
| ----------------------------- | ------------------------------------------------------- |
| Full project                  | `failed === 0`, all pass                                |
| cwd không tồn tại             | `total === 1`, fail, label `Project directory found`    |
| cwd là file                   | `total === 1`, label `Project directory is a directory` |
| Thiếu package.json            | fail critical                                           |
| JSON invalid                  | fail parse check                                        |
| Thiếu context files           | warn × 3, exit 0                                        |
| PM fallback                   | warn on PM check                                        |
| `doctor --json` thành công    | stdout parse JSON, `ok: true`, không có text header     |
| `doctor --json` critical fail | exit 1, `ok: false`, score fail                         |
| `doctor --fix` missing files  | tạo context files còn thiếu                             |
| `doctor --fix --dry-run`      | preview fix, không ghi file                             |
| `doctor --fix` untracked file | skip untracked, exit 1                                  |
| `doctor --fix --json`         | stdout parse JSON, có field `fix`                       |
| `doctor --fix` critical fail  | không chạy fix                                          |

### 5.1 FR-doctor-8 (`--json`) — assert tối thiểu

```ts
const parsed = JSON.parse(stdout);
expect(parsed).toMatchObject({
  cwd: expect.any(String),
  ok: expect.any(Boolean),
  score: {
    passed: expect.any(Number),
    warned: expect.any(Number),
    failed: expect.any(Number),
    total: expect.any(Number),
  },
  checks: expect.arrayContaining([
    expect.objectContaining({
      label: expect.any(String),
      status: expect.stringMatching(/^(pass|warn|fail)$/),
    }),
  ]),
});
expect(stdout).not.toContain("rfa doctor");
```

Map FR: [REQUIREMENTS.md § FR-doctor-8](./REQUIREMENTS.md#fr-doctor-8--json-output).

---

## 6. Case bắt buộc (generators)

| Case                    | Expect                                                   |
| ----------------------- | -------------------------------------------------------- |
| AGENTS.md spacing       | Không `\n{3,}`                                           |
| AGENTS.md sections      | Một dòng trống trước `## Files To Avoid Editing`         |
| COMMANDS.md PM fallback | `Install dependencies:` + `npm install`; không label dài |
| Mọi output file         | Kết thúc đúng một `\n`, không `\n\n`                     |

---

## 7. Case bắt buộc (init)

| Case                  | Expect                                             |
| --------------------- | -------------------------------------------------- |
| cwd không tồn tại     | exit 1, stderr message                             |
| `--dry-run`           | không tạo file mới                                 |
| File exists, no force | skipped                                            |
| `--force`             | overwritten                                        |
| `--cursor`            | tạo `.cursor/rules/ready-for-agents.mdc`           |
| `--claude`            | tạo `CLAUDE.md`                                    |
| `--all`               | tạo cả Cursor rules và `CLAUDE.md`                 |
| Config optional files | tạo optional files theo `.ready-for-agents.json`   |
| Config index off/on   | không sinh index khi config tắt; `--index` bật lại |

---

## 8. Case bắt buộc (update)

| Case                                    | Expect                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| Core files generated by tool            | overwrite `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md`         |
| Core files user-authored                | skip untracked, exit 1                                             |
| Generated file body edited after marker | hash mismatch → skip untracked, exit 1                             |
| `--force`                               | overwrite untracked files intentionally                            |
| `--dry-run`                             | preview overwrite/create/skip, không ghi file                      |
| Core files missing                      | tạo đủ 3 file core                                                 |
| `--all`                                 | refresh Cursor rules và `CLAUDE.md`                                |
| `--check` up to date                    | exit 0                                                             |
| `--check` missing/outdated/untracked    | exit 1                                                             |
| `--check --json`                        | parseable JSON with `upToDate`, `outdated`, `missing`, `untracked` |
| Config index                            | regenerate context tree theo config/flag                           |

---

## 9. Case bắt buộc (config/index)

| Case                    | Expect                                                   |
| ----------------------- | -------------------------------------------------------- |
| `config init --dry-run` | preview `.ready-for-agents.json`, không ghi file         |
| `config init`           | tạo config mặc định                                      |
| Config exists no force  | skip, không overwrite                                    |
| Config exists force     | overwrite                                                |
| Legacy config filename  | đọc `.agent-context-kit.json` khi chưa có config mới     |
| Config prompt target    | `prompt` dùng `prompt.target` khi bỏ `--target`          |
| `index` write           | tạo `.ready-for-agents/context-tree.json` parse được     |
| `index --dry-run`       | in metadata, không ghi file                              |
| `index --json`          | stdout parse JSON `{ ok, output, tree }`, không ghi file |

---

## 10. Case bắt buộc (query)

| Case              | Expectation                                                    |
| ----------------- | -------------------------------------------------------------- |
| Live fallback     | Nếu chưa có cache, query scan generated context files hiện có  |
| Cache JSON        | Nếu có context tree, `--json` trả `source: "cache"` parse được |
| Verification task | Query về test/build ưu tiên section `COMMANDS.md` phù hợp      |
| Empty query       | Exit `1`, in lỗi rõ ràng                                       |

---

## 11. Case bắt buộc (prompt)

| Case                   | Expect                                                 |
| ---------------------- | ------------------------------------------------------ |
| Empty/filler input     | exit 1                                                 |
| Multiple input sources | exit 1, clear error                                    |
| `--file` missing       | exit 1, clear error                                    |
| `--json`               | parseable JSON with `target`, `intent`, `task`, arrays |
| `--target auto`        | preserves current language-detection behavior          |
| `--target en`          | Response asks for English                              |
| `--target vi`          | Response asks for Vietnamese                           |
| Invalid `--target`     | exit 1, clear error                                    |
| Example suite          | 100-150 bilingual/mixed cases classify correctly       |
| Quality suite          | concrete task/requirements/verify/unclear/constraints  |

---

## 11. Chạy locally

```bash
pnpm test              # all
pnpm test tests/doctor.test.ts
pnpm test tests/generators.test.ts
pnpm typecheck
pnpm build
```

CI khuyến nghị: `test` + `typecheck` + `build` trên Node 18/20/22.

Ví dụ gate readiness trên project (sau khi cài CLI):

```bash
rfa doctor --json --cwd . | jq -e '.ok == true'
# hoặc chỉ dựa exit code:
rfa doctor --json --cwd .
```

---

## 12. Khi thêm tính năng

1. Viết FR trong `REQUIREMENTS.md`.
2. Thêm test trước hoặc cùng PR với code.
3. Cập nhật `DETECTION_RULES.md` / `GENERATED_FILES_SPEC.md` nếu đổi contract.
4. Không commit `.pnpm-store` / fixture leak — `afterEach` cleanup.

---

## 13. Gaps (có thể bổ sung)

- [ ] E2E: `node dist/cli.js doctor` subprocess + assert stdout
- [ ] Golden file: snapshot `generateAllFiles` cho fixture cố định
- [ ] Property test: parseScriptRefs không bắt `pnpm install`
