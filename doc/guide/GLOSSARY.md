# Thuật ngữ (Glossary)

| Thuật ngữ | Định nghĩa |
|-----------|------------|
| **agent-context-kit** | Tên package CLI; tool sinh/kiểm tra context cho AI agent |
| **Context file** | `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md` tại root project |
| **ProjectContext** | Object TypeScript gom kết quả quét project; input cho generators |
| **Static detection** | Suy luận từ file có sẵn; không chạy build/test |
| **Package manager (PM)** | npm, pnpm, yarn, hoặc bun |
| **PM source** | `lockfile` \| `package.json` \| `fallback` — cách xác định PM |
| **Fallback (npm)** | Không có lockfile và không có field `packageManager` |
| **Stack layer** | Một trong frontend / backend / database với `label` + `source` deps |
| **ScriptKey** | Tên logic script: dev, build, test, lint, typecheck, format |
| **Script alias** | Tên script thực trong package.json map vào ScriptKey |
| **Related dev scripts** | Script `dev:*` hoặc được gọi trong lệnh `dev` chính |
| **Important folders** | `src`, `app`, `pages`, `components`, `lib`, `tests` nếu tồn tại ở root |
| **Ignored scan dirs** | Tên folder không nên quét/sửa (`node_modules`, …) |
| **Output file** | Một trong ba file const `OUTPUT_FILES` |
| **Dry run** | `init --dry-run`: preview đầy đủ, không `writeFileSync` |
| **Force** | `init --force`: ghi đè file output đã tồn tại |
| **Doctor check** | Một dòng kết quả pass / warn / fail |
| **Critical failure** | Bất kỳ doctor check nào status `fail` → exit code 1 |
| **`doctor --json`** | Chế độ in một JSON object trên stdout cho CI; field `ok` mirror exit code |
| **Fail-fast (cwd)** | cwd sai → chỉ 1 check, không chạy 10 check còn lại |
| **Score line** | `Score: P/T · W warnings · F failures` |
| **MVP** | Phạm vi v0.1: Node.js, init + doctor, không AI API |
| **Generator** | Hàm `(ProjectContext) => string` sinh Markdown |
| **Detector** | Hàm suy luận PM, stack, scripts, folders từ metadata |
