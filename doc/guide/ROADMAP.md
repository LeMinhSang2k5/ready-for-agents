# Roadmap sản phẩm

Đồng bộ với [README.md](../../README.md#roadmap). Chi tiết FR planned: [REQUIREMENTS.md](./REQUIREMENTS.md#fr-planned--roadmap).

---

## Đã ship (v0.1.x)

| Tính năng               | Mô tả ngắn                                                     |
| ----------------------- | -------------------------------------------------------------- |
| `init`                  | Sinh `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md`          |
| `init --dry-run`        | Preview không ghi disk                                         |
| `init --force`          | Ghi đè file output                                             |
| Static detect           | PM, stack, scripts, folders                                    |
| `doctor`                | 11 check + score; fail-fast cwd                                |
| Safe writes             | Skip file đã tồn tại                                           |
| `prompt`                | Instruction thô → prompt có cấu trúc (không AI API)            |
| `prompt --json`         | JSON cho automation                                            |
| `prompt --file`         | Đọc instruction từ file                                        |
| `prompt --target`       | Chọn instruction ngôn ngữ `auto`, `en`, hoặc `vi`              |
| `prompt` (interactive)  | Interactive mode khi không có arg và stdin là TTY              |
| `.cursor/rules`         | Cursor project rule tùy chọn qua `init --cursor` hoặc `--all`  |
| `CLAUDE.md`             | Claude Code guidance tùy chọn qua `init --claude` hoặc `--all` |
| `update`                | Refresh generated context files sau khi repo đổi               |
| `update --check --json` | Machine-readable freshness check cho CI                        |
| Generated marker/hash   | Bảo vệ file user tự viết khi chạy `update`                     |
| `doctor --fix`          | Doctor có thể tạo/refresh context files an toàn                |

---

## Đang plan

### Prompt (sau MVP)

| Version | Item                                                     |
| ------- | -------------------------------------------------------- |
| v0.2    | `--style codex\|cursor\|claude`, token estimate chi tiết |
| v0.3    | `--ai` rewrite opt-in, `--budget`, `--preserve-language` |

---

## Đang plan (khác)

### P1 — Cận hạn trước

| Item                                  | Lợi ích                                      | Phụ thuộc spec |
| ------------------------------------- | -------------------------------------------- | -------------- |
| Config file `.agent-context-kit.json` | Cho phép chọn default optional files / style | CLI_SPEC       |

### P2 — Mở rộng agent ecosystem

| Item          | Lợi ích                 |
| ------------- | ----------------------- |
| GitHub Action | CI keep context in sync |

### P3 — Ngôn ngữ & AI

| Item                      | Lợi ích                                     |
| ------------------------- | ------------------------------------------- |
| Python / FastAPI / Django | Ngoài Node-only                             |
| Optional AI summaries     | Richer PROJECT_CONTEXT (cần API key policy) |

---

## Nguyên tắc ưu tiên

1. **Static-first** — không phụ thuộc network cho core path.
2. **Safe by default** — không ghi đè; doctor không mutate.
3. **Spec trước code** — cập nhật `doc/guide` khi đổi contract.
4. **Test theo FR** — mỗi FR mới có test map trong REQUIREMENTS.

---

## Versioning (đề xuất)

| Bump  | Khi nào                                               |
| ----- | ----------------------------------------------------- |
| PATCH | Fix detect, wording template                          |
| MINOR | Lệnh mới backward-compatible, thêm doctor check warn  |
| MAJOR | Đổi format file sinh bắt buộc, bỏ flag, đổi exit code |

`CHANGELOG.md` đã có; khi release chỉ cần chuyển mục `[Unreleased]` sang version cụ thể và tag tương ứng.
