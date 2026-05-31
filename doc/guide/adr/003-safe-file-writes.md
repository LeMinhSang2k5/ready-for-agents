# ADR-003: Không ghi đè file context mặc định

## Status

Accepted

## Context

Sau `init`, user thường **chỉnh tay** `AGENTS.md` (quy tắc team). Ghi đè mỗi lần chạy lại sẽ mất customization.

## Decision

- `writeGeneratedFiles`: nếu file tồn tại và không `--force` → `skipped`.
- `--dry-run` không bao giờ gọi `writeFileSync`.
- Message terminal gợi ý `--force` khi skip.

## Consequences

**Ưu:** An toàn cho production repos; phù hợp “chạy thử init”.

**Nhược:** Refresh context cần nhớ `--force` hoặc chờ lệnh `update` (planned).

**Liên quan:** `doctor` warn khi thiếu file — không tự tạo.
