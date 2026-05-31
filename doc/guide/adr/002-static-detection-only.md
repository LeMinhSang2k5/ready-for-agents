# ADR-002: Chỉ detect tĩnh, không gọi AI API

## Status

Accepted

## Context

Mục tiê sản phẩm: setup nhanh, offline-friendly, deterministic. User không muốn API key chỉ để sinh context cơ bản.

## Decision

- Mọi thông tin trong `ProjectContext` lấy từ `package.json`, lockfile presence, root folder names, dependencies keys.
- Generators là template string + logic TypeScript thuần.
- Roadmap có “optional AI summaries” tách biệt, opt-in sau.

## Consequences

**Ưu:** Nhanh, testable, không cost API, reproducible.

**Nhược:** Không mô tả kiến trúc phức tạp không thể hiện trong package.json; user phải bổ sung README hoặc chỉnh file sinh tay.
