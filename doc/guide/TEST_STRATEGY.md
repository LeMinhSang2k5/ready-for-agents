# Chiến lược kiểm thử (Test Strategy)

Runner: **Vitest** (`pnpm test`).

Hiện tại: **60 tests** trong 6 file (cập nhật khi thêm test).

---

## 1. Mục tiêu

| Mục tiêu | Cách đạt |
|----------|----------|
| Khóa behavior FR | Map test ↔ [REQUIREMENTS.md](./REQUIREMENTS.md) |
| Bảo vệ detect rules | `detectors.test.ts`, `package-manager.test.ts` |
| An toàn ghi file | `init-safety.test.ts` |
| Doctor contract | `doctor.test.ts` (text + `--json`) |
| CI machine-readable | `doctor.test.ts` → `runDoctor --json` (FR-doctor-8) |
| Validation init | `validation.test.ts` |
| Format output Markdown | `generators.test.ts` |

**Không** mục tiêu (hiện tại): coverage % bắt buộc, E2E CLI subprocess, snapshot toàn file Markdown.

---

## 2. Phân lớp test

```text
┌─────────────────────────────────────┐
│  Integration-ish (runInit stdout)   │  validation.test.ts
├─────────────────────────────────────┤
│  Component (init write/dry-run)     │  init-safety.test.ts
├─────────────────────────────────────┤
│  Unit (detectors, doctor, PM)       │  detectors, doctor, package-manager
├─────────────────────────────────────┤
│  Generator output contract          │  generators.test.ts
└─────────────────────────────────────┘
```

---

## 3. File test ↔ phạm vi

| File | Số test ~ | Phạm vi |
|------|-----------|---------|
| `doctor.test.ts` | 14 | `runDoctorChecks`, `formatScore`, `hasCriticalFailure`, cwd early exit, `--json` |
| `validation.test.ts` | 7 | `runInit` validation, dry-run không ghi |
| `init-safety.test.ts` | 14 | skip/force/overwrite, dry-run plan |
| `detectors.test.ts` | 16 | stack, scripts, related scripts, labels |
| `package-manager.test.ts` | 5 | lockfile priority, field parse, fallback |
| `generators.test.ts` | 4 | AGENTS spacing, COMMANDS fallback label, trailing newline |

---

## 4. Fixture pattern

### 4.1 `makeFixture` (doctor)

```ts
mkdtempSync(join(tmpdir(), `ack-doctor-${name}-`))
// write files với mkdirSync(dirname(full))
// afterEach: rmSync recursive
```

### 4.2 Init tests

Tương tự temp dir hoặc mock cwd; kiểm tra disk state sau `runInit`.

### 4.3 Missing cwd (doctor)

`join(tmpdir(), \`missing-agent-context-kit-${randomUUID()}\`)` — tránh collision.

---

## 5. Case bắt buộc (doctor)

| Case | Expect |
|------|--------|
| Full project | `failed === 0`, all pass |
| cwd không tồn tại | `total === 1`, fail, label `Project directory found` |
| cwd là file | `total === 1`, label `Project directory is a directory` |
| Thiếu package.json | fail critical |
| JSON invalid | fail parse check |
| Thiếu context files | warn × 3, exit 0 |
| PM fallback | warn on PM check |
| `doctor --json` thành công | stdout parse JSON, `ok: true`, không có text header |
| `doctor --json` critical fail | exit 1, `ok: false`, score fail |

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
    expect.objectContaining({ label: expect.any(String), status: expect.stringMatching(/^(pass|warn|fail)$/) }),
  ]),
});
expect(stdout).not.toContain("agent-context-kit doctor");
```

Map FR: [REQUIREMENTS.md § FR-doctor-8](./REQUIREMENTS.md#fr-doctor-8--json-output).

---

## 6. Case bắt buộc (generators)

| Case | Expect |
|------|--------|
| AGENTS.md spacing | Không `\n{3,}` |
| AGENTS.md sections | Một dòng trống trước `## Files To Avoid Editing` |
| COMMANDS.md PM fallback | `Install dependencies:` + `npm install`; không label dài |
| Mọi output file | Kết thúc đúng một `\n`, không `\n\n` |

---

## 7. Case bắt buộc (init)

| Case | Expect |
|------|--------|
| cwd không tồn tại | exit 1, stderr message |
| `--dry-run` | không tạo file mới |
| File exists, no force | skipped |
| `--force` | overwritten |

---

## 8. Chạy locally

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
agent-context-kit doctor --json --cwd . | jq -e '.ok == true'
# hoặc chỉ dựa exit code:
agent-context-kit doctor --json --cwd .
```

---

## 9. Khi thêm tính năng

1. Viết FR trong `REQUIREMENTS.md`.
2. Thêm test trước hoặc cùng PR với code.
3. Cập nhật `DETECTION_RULES.md` / `GENERATED_FILES_SPEC.md` nếu đổi contract.
4. Không commit `.pnpm-store` / fixture leak — `afterEach` cleanup.

---

## 10. Gaps (có thể bổ sung)

- [ ] E2E: `node dist/cli.js doctor` subprocess + assert stdout
- [ ] Golden file: snapshot `generateAllFiles` cho fixture cố định
- [ ] Property test: parseScriptRefs không bắt `pnpm install`
