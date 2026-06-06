# ADR-001: Doctor dừng sớm khi `--cwd` không hợp lệ

## Status

Accepted

## Context

User thường chạy:

```bash
rfa doctor --cwd /sai/duong/dan
```

Nếu tiếp tục chạy đủ 11 check, mọi check file (`package.json`, context files, scripts) đều fail/warn vì path không phải project thật. Output dài và **che mất nguyên nhân gốc**: thư mục không tồn tại hoặc không phải directory.

## Decision

`runDoctorChecks` kiểm tra cwd **trước** mọi check khác:

1. `!existsSync(cwd)` → return 1 check fail, label `Project directory found`, detail `` `${cwd} does not exist` ``.
2. `!stat.isDirectory()` → return 1 check fail, label `Project directory is a directory`.

Không gọi `resolvePackageManager`, không `existsSync` context files.

## Consequences

**Ưu:**

- UX rõ: một dòng lỗi, `Score: 0/1`.
- Nhanh hơn (ít syscall).
- Test đơn giản (`total === 1`).

**Nhược:**

- Label `Project directory found` khi fail hơi counter-intuitive (nhưng thống nhất với format `✗ label (detail)`).
- Khác với `init` dùng `validateCwd` message — chấp nhận vì output format khác nhau.

## Alternatives considered

| Phương án                       | Lý do loại                                  |
| ------------------------------- | ------------------------------------------- |
| Chạy hết check, fail tất cả     | Noise, khó debug                            |
| Chỉ in stderr, không check line | Không có score / không thống nhất doctor UX |
