# Đặc tả quy tắc phát hiện (Detection Rules)

Mọi rule **tĩnh** — chỉ đọc metadata project, không chạy `npm ls` hay build.

Implementation: `src/detectors/`, `src/constants.ts`.

---

## 1. Package manager

### 1.1 Thứ tự ưu tiên

```text
lockfile (first match) → package.json "packageManager" → npm (fallback)
```

### 1.2 Lockfile scan order

| Thứ tự | File                | PM   |
| ------ | ------------------- | ---- |
| 1      | `pnpm-lock.yaml`    | pnpm |
| 2      | `yarn.lock`         | yarn |
| 3      | `bun.lockb`         | bun  |
| 4      | `bun.lock`          | bun  |
| 5      | `package-lock.json` | npm  |

Chỉ `existsSync` tại `join(cwd, file)` — không parse nội dung lockfile.

### 1.3 Field `packageManager`

- Format: `"pnpm@9.0.0"`, `"yarn@berry"`, …
- Lấy phần trước `@` đầu tiên, lowercase.
- Hợp lệ: `npm`, `pnpm`, `yarn`, `bun`.

### 1.4 Fallback

- `manager: "npm"`, `source: "fallback"`.
- `doctor`: **warn** (không fail).
- Generators: label có thể ghi `(fallback)` hoặc note trong PROJECT_CONTEXT.

---

## 2. Stack detection

### 2.1 Cơ chế

- Gộp `dependencies` + `devDependencies` thành một map.
- Mỗi **layer** (frontend, backend, database) chạy danh sách rule **theo thứ tự**.
- Rule khớp khi **mọi** package trong `deps[]` có mặt (`hasDeps`).
- **First match wins** — không gộp nhiều rule trong cùng layer.

### 2.2 Frontend rules (thứ tự)

| deps (all required) | label       |
| ------------------- | ----------- |
| `next`              | Next.js     |
| `nuxt`              | Nuxt        |
| `vite`, `react`     | React/Vite  |
| `vite`, `vue`       | Vue/Vite    |
| `react-scripts`     | React (CRA) |
| `react`             | React       |
| `vue`               | Vue         |
| `svelte`            | Svelte      |

### 2.3 Backend rules (thứ tự)

| deps           | label   |
| -------------- | ------- |
| `@nestjs/core` | NestJS  |
| `express`      | Express |
| `fastify`      | Fastify |
| `koa`          | Koa     |
| `hono`         | Hono    |

### 2.4 Database rules (thứ tự)

| deps             | label            |
| ---------------- | ---------------- |
| `mongoose`       | MongoDB/Mongoose |
| `mongodb`        | MongoDB          |
| `@prisma/client` | Prisma           |
| `prisma`         | Prisma           |
| `typeorm`        | TypeORM          |
| `pg`             | PostgreSQL       |
| `mysql2`         | MySQL            |
| `better-sqlite3` | SQLite           |
| `ioredis`        | Redis            |
| `redis`          | Redis            |

### 2.5 Summary strings

| Hàm                     | Logic                                                     |
| ----------------------- | --------------------------------------------------------- |
| `stackFrameworkSummary` | `frontend.label + " + " + backend.label` hoặc `"Node.js"` |
| `stackDatabaseSummary`  | `database?.label`                                         |
| `isStackEmpty`          | không có layer nào                                        |

---

## 3. Script detection

### 3.1 Logical keys (`ScriptKey`)

`dev`, `build`, `test`, `lint`, `typecheck`, `format`

### 3.2 Aliases (first match in package.json)

| Key       | Aliases                                  |
| --------- | ---------------------------------------- |
| dev       | `dev`, `start:dev`, `develop`            |
| build     | `build`                                  |
| test      | `test`, `test:unit`, `test:run`          |
| lint      | `lint`, `eslint`                         |
| typecheck | `typecheck`, `type-check`, `check:types` |
| format    | `format`, `prettier`, `fmt`              |

### 3.3 Related dev scripts

Nguồn:

1. Keys trong `scripts` có prefix `dev:` (ví dụ `dev:client`).
2. Tên script parse từ lệnh `dev` chính qua regex:
   - `npm run <name>`
   - `pnpm run <name>`
   - `bun run <name>`
   - `yarn run <name>`
   - `yarn <name>` (loại trừ subcommand yarn như `install`, `add`, …)

### 3.4 Run command template

| PM   | Pattern                |
| ---- | ---------------------- |
| pnpm | `pnpm <scriptName>`    |
| yarn | `yarn <scriptName>`    |
| bun  | `bun run <scriptName>` |
| npm  | `npm run <scriptName>` |

---

## 4. Important folders

### 4.1 Danh sách (`IMPORTANT_FOLDERS`)

`src`, `app`, `pages`, `components`, `lib`, `tests`

### 4.2 Cách detect

- Chỉ tại **project root**: `join(cwd, folderName)`.
- `existsSync` + `statSync.isDirectory()`.
- Bỏ qua nếu tên folder ∈ `IGNORED_SCAN_DIRS` (phòng trường hợp tên trùng).

### 4.3 Ignored directory names (`IGNORED_SCAN_DIRS`)

`node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`

MVP **không** walk vào các folder này — chỉ dùng để filter tên và ghi trong AGENTS.md.

---

## 5. README detection

- `hasReadme(cwd)`: `README.md` **hoặc** `README.MD` tại root.
- Dùng trong generators (notes) và `doctor` (warn nếu thiếu).

---

## 6. package.json đọc cho init

| Field             | Map vào                       |
| ----------------- | ----------------------------- |
| `name`            | `ProjectContext.name`         |
| `scripts`         | `ProjectContext.scripts`      |
| `dependencies`    | `dependencies`                |
| `devDependencies` | `devDependencies`             |
| `packageManager`  | input `resolvePackageManager` |

Thiếu `package.json` → `readProject` trả context rỗng; `init` fail validation.

---

## 7. Thay đổi rule

Khi thêm rule stack hoặc alias script:

1. Sửa detector tương ứng.
2. Thêm case trong `tests/detectors.test.ts` hoặc `package-manager.test.ts`.
3. Cập nhật file này và `README.md` bảng detect.
4. Cân nhắc `doctor` nếu file/script mới là “bắt buộc” cho readiness.
