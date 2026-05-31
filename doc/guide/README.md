# Tài liệu đặc tả — agent-context-kit

Bộ tài liệu giúp hiểu **hệ thống** (yêu cầu, CLI, dữ liệu, kiến trúc) và **mã nguồn** (workflow từng file).

**User-facing:** [README.md](../../README.md) (EN) · [README.vi.md](../../README.vi.md) (VI)

**Release:** [CHANGELOG.md](../../CHANGELOG.md) · [PUBLISH_CHECKLIST.md](../../PUBLISH_CHECKLIST.md)

---

## Đọc theo vai trò

| Bạn là… | Bắt đầu từ |
|---------|------------|
| Người mới vào project | [OVERVIEW.md](./OVERVIEW.md) |
| PM / QA / viết test | [REQUIREMENTS.md](./REQUIREMENTS.md) + [CLI_SPEC.md](./CLI_SPEC.md) |
| Dev implement feature | [ARCHITECTURE.md](./ARCHITECTURE.md) + [SRC_WORKFLOW.md](./SRC_WORKFLOW.md) |
| Dev sửa detect / template | [DETECTION_RULES.md](./DETECTION_RULES.md) + [GENERATED_FILES_SPEC.md](./GENERATED_FILES_SPEC.md) |
| Dev sửa doctor / init | [DATA_MODEL.md](./DATA_MODEL.md) + [REQUIREMENTS.md](./REQUIREMENTS.md) |

---

## Mục lục đầy đủ

### Tổng quan & yêu cầu

| File | Nội dung |
|------|----------|
| [OVERVIEW.md](./OVERVIEW.md) | Hệ thống là gì, phạm vi, hai lệnh, ràng buộc thiết kế |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Functional requirements + acceptance criteria |
| [NON_FUNCTIONAL.md](./NON_FUNCTIONAL.md) | Hiệu năng, bảo mật, tương thích, giới hạn MVP |
| [ROADMAP.md](./ROADMAP.md) | Đã ship vs planned |

### Giao diện & dữ liệu

| File | Nội dung |
|------|----------|
| [CLI_SPEC.md](./CLI_SPEC.md) | Subcommands, flags, exit code, format output |
| [DATA_MODEL.md](./DATA_MODEL.md) | `ProjectContext`, `DoctorResult`, luồng dữ liệu |

### Domain & output

| File | Nội dung |
|------|----------|
| [DETECTION_RULES.md](./DETECTION_RULES.md) | PM, stack, scripts, folders, ignore list |
| [GENERATED_FILES_SPEC.md](./GENERATED_FILES_SPEC.md) | Cấu trúc AGENTS / PROJECT_CONTEXT / COMMANDS |

### Kiến trúc & code

| File | Nội dung |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Layers, dependency, extension points |
| [SRC_WORKFLOW.md](./SRC_WORKFLOW.md) | Workflow chi tiết, map file/hàm trong `src/` |
| [adr/](./adr/) | Architecture Decision Records |

### Chất lượng & thuật ngữ

| File | Nội dung |
|------|----------|
| [TEST_STRATEGY.md](./TEST_STRATEGY.md) | Vitest, fixture, case bắt buộc |
| [GLOSSARY.md](./GLOSSARY.md) | Thuật ngữ dùng trong docs |

---

## Thứ tự đọc đề xuất (30–60 phút)

1. [OVERVIEW.md](./OVERVIEW.md)  
2. [REQUIREMENTS.md](./REQUIREMENTS.md)  
3. [CLI_SPEC.md](./CLI_SPEC.md)  
4. [DATA_MODEL.md](./DATA_MODEL.md)  
5. [ARCHITECTURE.md](./ARCHITECTURE.md)  
6. [DETECTION_RULES.md](./DETECTION_RULES.md) + [GENERATED_FILES_SPEC.md](./GENERATED_FILES_SPEC.md)  
7. [SRC_WORKFLOW.md](./SRC_WORKFLOW.md)  

Tham khảo khi cần: [GLOSSARY.md](./GLOSSARY.md), [TEST_STRATEGY.md](./TEST_STRATEGY.md), [NON_FUNCTIONAL.md](./NON_FUNCTIONAL.md), [ROADMAP.md](./ROADMAP.md).

---

## Đọc nhanh — luồng lệnh

### `init` — sinh context

1. `cli.ts` → `runInit()`
2. `validateInitTarget` → `readProject()` → `ProjectContext`
3. `generateAllFiles()` → 3 file Markdown
4. `writeGeneratedFiles()` hoặc dry-run preview

### `doctor` — kiểm tra

1. `cli.ts` → `runDoctor()`
2. `runDoctorChecks(cwd)` — fail-fast nếu cwd sai
3. In Checks + `formatScore` → exit 0/1

Chi tiết code: [SRC_WORKFLOW.md](./SRC_WORKFLOW.md).

---

## Trạng thái tài liệu

| Phiên bản code | Tài liệu |
|----------------|----------|
| v0.1.x | `init` + `doctor` shipped; 60 tests |

Khi đổi behavior: cập nhật **REQUIREMENTS** + **CLI_SPEC** (+ detector/generated spec nếu liên quan) trong cùng PR với code.
