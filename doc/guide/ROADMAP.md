# Roadmap sản phẩm

Đồng bộ với [README.md](../../README.md#roadmap). Chi tiết FR planned: [REQUIREMENTS.md](./REQUIREMENTS.md#fr-planned--roadmap).

---

## Đã ship (v0.1.x)

| Tính năng | Mô tả ngắn |
|-----------|------------|
| `init` | Sinh `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md` |
| `init --dry-run` | Preview không ghi disk |
| `init --force` | Ghi đè file output |
| Static detect | PM, stack, scripts, folders |
| `doctor` | 11 check + score; fail-fast cwd |
| Safe writes | Skip file đã tồn tại |

---

## Đang plan

### P1 — Cận hạn trước

| Item | Lợi ích | Phụ thuộc spec |
|------|---------|----------------|
| `update` | Refresh context khi package.json đổi | GENERATED_FILES merge rules |
| Doctor ↔ init align | Doctor có thể gợi ý chạy `init` | CLI_SPEC |

### P2 — Mở rộng agent ecosystem

| Item | Lợi ích |
|------|---------|
| `.cursor/rules` generator | Cursor-native rules |
| `CLAUDE.md` generator | Claude Code convention |
| GitHub Action | CI keep context in sync |

### P3 — Ngôn ngữ & AI

| Item | Lợi ích |
|------|---------|
| Python / FastAPI / Django | Ngoài Node-only |
| Optional AI summaries | Richer PROJECT_CONTEXT (cần API key policy) |

---

## Nguyên tắc ưu tiên

1. **Static-first** — không phụ thuộc network cho core path.
2. **Safe by default** — không ghi đè; doctor không mutate.
3. **Spec trước code** — cập nhật `doc/guide` khi đổi contract.
4. **Test theo FR** — mỗi FR mới có test map trong REQUIREMENTS.

---

## Versioning (đề xuất)

| Bump | Khi nào |
|------|---------|
| PATCH | Fix detect, wording template |
| MINOR | Lệnh mới backward-compatible, thêm doctor check warn |
| MAJOR | Đổi format file sinh bắt buộc, bỏ flag, đổi exit code |

Chưa có `CHANGELOG.md` — nên thêm khi publish npm public.
