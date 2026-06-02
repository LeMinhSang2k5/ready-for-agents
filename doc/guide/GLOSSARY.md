# Thuật ngữ (Glossary)

| Thuật ngữ                  | Định nghĩa                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| **agent-context-kit**      | Tên package CLI; tool sinh/kiểm tra context cho AI agent                                     |
| **Context file**           | `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md` tại root project                            |
| **ProjectContext**         | Object TypeScript gom kết quả quét project; input cho generators                             |
| **Static detection**       | Suy luận từ file có sẵn; không chạy build/test                                               |
| **Package manager (PM)**   | npm, pnpm, yarn, hoặc bun                                                                    |
| **PM source**              | `lockfile` \| `package.json` \| `fallback` — cách xác định PM                                |
| **Fallback (npm)**         | Không có lockfile và không có field `packageManager`                                         |
| **Stack layer**            | Một trong frontend / backend / database với `label` + `source` deps                          |
| **ScriptKey**              | Tên logic script: dev, build, test, lint, typecheck, format                                  |
| **Script alias**           | Tên script thực trong package.json map vào ScriptKey                                         |
| **Related dev scripts**    | Script `dev:*` hoặc được gọi trong lệnh `dev` chính                                          |
| **Important folders**      | `src`, `app`, `pages`, `components`, `lib`, `tests` nếu tồn tại ở root                       |
| **Ignored scan dirs**      | Tên folder không nên quét/sửa (`node_modules`, …)                                            |
| **Output file**            | Một file trong `OUTPUT_FILES`, gồm 3 core files và optional Cursor/Claude files              |
| **Generated marker**       | HTML comment `agent-context-kit:generated` ở cuối file, kèm `file` và `hash`                 |
| **Tracked generated file** | File có generated marker đúng path và hash khớp body, được `update` refresh                  |
| **Untracked file**         | File output đã tồn tại nhưng không có marker hợp lệ; `update` skip trừ khi `--force`         |
| **Dry run**                | `init --dry-run`: preview đầy đủ, không `writeFileSync`                                      |
| **Force**                  | `init --force`, `update --force`, hoặc `doctor --fix --force`: ghi đè file output đã tồn tại |
| **Doctor check**           | Một dòng kết quả pass / warn / fail                                                          |
| **Critical failure**       | Bất kỳ doctor check nào status `fail` → exit code 1                                          |
| **`doctor --json`**        | Chế độ in một JSON object trên stdout cho CI; field `ok` mirror exit code                    |
| **`doctor --fix`**         | Chế độ tạo missing context files và refresh outdated generated files                         |
| **`update --check`**       | Chế độ kiểm tra context files đã up to date chưa; không ghi file                             |
| **`update --json`**        | Chế độ in `UpdateCheckJsonOutput` trên stdout; không ghi file                                |
| **Fail-fast (cwd)**        | cwd sai → chỉ 1 check, không chạy 10 check còn lại                                           |
| **Score line**             | `Score: P/T · W warnings · F failures`                                                       |
| **MVP**                    | Phạm vi v0.1: Node.js, init + update + doctor + prompt, không AI API                         |
| **Generator**              | Hàm `(ProjectContext) => string` sinh Markdown                                               |
| **Detector**               | Hàm suy luận PM, stack, scripts, folders từ metadata                                         |
