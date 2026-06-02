# Architecture Decision Records (ADR)

Ghi lại quyết định thiết kế quan trọng — **tại sao** chọn X thay vì Y.

| ADR                                   | Tiêu đề                                  | Trạng thái |
| ------------------------------------- | ---------------------------------------- | ---------- |
| [001](./001-doctor-fail-fast-cwd.md)  | Doctor dừng sớm khi `--cwd` không hợp lệ | Accepted   |
| [002](./002-static-detection-only.md) | Chỉ detect tĩnh, không gọi AI API        | Accepted   |
| [003](./003-safe-file-writes.md)      | Không ghi đè file context mặc định       | Accepted   |

## Template ADR mới

```markdown
# ADR-NNN: Title

## Status

Proposed | Accepted | Deprecated

## Context

...

## Decision

...

## Consequences

- ...
```
