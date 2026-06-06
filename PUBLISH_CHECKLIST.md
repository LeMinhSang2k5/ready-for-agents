# Publish checklist — ready-for-agents

Checklist trước khi `npm publish` (hoặc `pnpm publish`). Chạy từ root repo.

---

## 1. Version & changelog

- Bump `version` in `package.json` (semver: patch / minor / major) — hiện **0.2.2**
- Cập nhật [CHANGELOG.md](./CHANGELOG.md): chuyển mục `[Unreleased]` → `[x.y.z] - YYYY-MM-DD`
- Tag git: `git tag vX.Y.Z` (sau khi merge release)

---

## 2. Build & quality

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm run build
```

- `pnpm typecheck` — pass
- `pnpm test` — pass (hiện 279 tests)
- `pnpm run build` — `dist/` mới nhất (CLI đọc từ đây)

---

## 3. Smoke test CLI (local)

```bash
node dist/cli.js --version
node dist/cli.js --help
node dist/cli.js init --help
node dist/cli.js i --help
node dist/cli.js update --help
node dist/cli.js u --help
node dist/cli.js diff --help
node dist/cli.js ci --help
node dist/cli.js doctor --help
node dist/cli.js d --help
node dist/cli.js prompt --help
node dist/cli.js p --help
node dist/cli.js config init --help
node dist/cli.js c i --help
node dist/cli.js index --help
node dist/cli.js x --help
node dist/cli.js query --help
node dist/cli.js q --help
node dist/cli.js doctor --json --cwd .
node dist/cli.js doctor --fix --dry-run --cwd .
node dist/cli.js update --check --json --cwd .
node dist/cli.js diff --json --cwd .
node dist/cli.js ci --dry-run --cwd .
node dist/cli.js init --copilot --dry-run --cwd .
node dist/cli.js config init --dry-run --cwd .
node dist/cli.js index --dry-run --cwd .
node dist/cli.js index --json --cwd .
node dist/cli.js query "how should I verify this change?" --cwd .
node dist/cli.js query "show stack and dependencies" --json --cwd .
node dist/cli.js prompt "how should I verify this change?" --context --compact --cwd .
node dist/cli.js p "how should I verify this change?" --cwd .
```

- `doctor` text mode in ra Checks + Score
- `doctor --json` in **một dòng JSON** parse được; `jq .` ok
- `doctor --fix --dry-run` in fix preview và không ghi file
- `update --check --json` in JSON parse được; exit `0` khi context current, exit `1` khi missing/outdated/untracked
- `diff --json` parse được; exit `0` khi current, exit `1` khi missing/outdated/untracked
- `ci --dry-run` preview `.github/workflows/ready-for-agents.yml` và không ghi file
- `init --copilot --dry-run` preview `.github/copilot-instructions.md`
- `config init --dry-run` in `.ready-for-agents.json` preview và không ghi file
- `index --dry-run` in metadata; `index --json` parse được
- `query` text mode in section refs; `query --json` parse được
- `prompt --context --compact` và `p` in `Relevant Context` khi context files tồn tại
- Help output dùng canonical name `rfa`; alias `i/d/u/p/c i/x/q` hoạt động
- Exit `0` khi project pass/warn-only; exit `1` khi cwd sai hoặc thiếu `package.json`

```bash
node dist/cli.js doctor --json --cwd /nonexistent
echo $?   # expect 1
```

---

## 4. Package contents (`npm pack`)

```bash
npm pack --dry-run
```

Tarball phải gồm:

- `dist/` (compiled JS + `.d.ts`)
- `doc/guide/` (specs; README links hoạt động trên npm)
- `CHANGELOG.md`, `PUBLISH_CHECKLIST.md`
- `README.md`, `README.vi.md`, `LICENSE`, `package.json` (npm luôn đính kèm)

Không publish:

- `src/`, `tests/`, `.pnpm-store/` **không** nằm trong tarball (trừ khi cố ý đổi `files`)

```bash
npm pack
tar -tzf ready-for-agents-*.tgz | head -30
```

---

## 5. `prepublishOnly`

`package.json` có:

```json
"prepublishOnly": "pnpm run build"
```

- Không publish khi `build` fail
- Không dùng `--ignore-scripts` trừ khi đã build tay và hiểu rủi ro

---

## 6. npm registry metadata

Trước lần publish đầu, cân nhắc thêm vào `package.json`:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/LeMinhSang2k5/ready-for-agents.git"
},
"homepage": "https://github.com/LeMinhSang2k5/ready-for-agents#readme",
"bugs": {
  "url": "https://github.com/LeMinhSang2k5/ready-for-agents/issues"
}
```

- `repository` / `homepage` đã khai báo (nếu public)
- Đăng nhập npm: `npm whoami`
- Tên package `ready-for-agents` còn trống hoặc bạn có quyền publish

---

## 7. Publish

```bash
# dry-run registry (optional)
npm publish --dry-run

# thật
npm publish --access public
```

- Xác nhận trên [https://www.npmjs.com/package/ready-for-agents](https://www.npmjs.com/package/ready-for-agents)
- `npx --package ready-for-agents@X.Y.Z rfa doctor --json` từ máy sạch (hoặc CI)

---

## 7b. Trusted Publisher (GitHub Actions → npm, khuyến nghị)

Workflow: `[.github/workflows/publish.yml](./.github/workflows/publish.yml)`

**Thứ tự:**

1. Push workflow lên `main` (file phải tồn tại trước)
2. npm → package **ready-for-agents** → **Settings** → **Trusted Publisher** → **GitHub Actions**

- User: `LeMinhSang2k5`
- Repository: `ready-for-agents`
- Workflow filename: `publish.yml`
- Allowed actions: **Publish**

3. Release: bump `package.json` + `CHANGELOG.md` → tag `vX.Y.Z` → `git push origin vX.Y.Z`

Action chạy: `pnpm typecheck` → `test` → `build` → `pnpm publish --provenance` (không cần `NPM_TOKEN`).

Hoặc: **Actions** → **Publish to npm** → **Run workflow** (`workflow_dispatch`).

---

## 8. Sau publish

- GitHub Release notes (copy từ CHANGELOG)
- Cập nhật [doc/guide/README.md](./doc/guide/README.md) nếu đổi test count / features
- Roadmap trong README — đánh dấu item đã ship

---

## CI gate gợi ý (consumer repos)

```yaml
- run: npx --package ready-for-agents rfa doctor --json --cwd .
- run: test "$(jq -e '.ok == true' < doctor.json)" # nếu redirect stdout
```

Hoặc chỉ: `npx --package ready-for-agents rfa doctor --json --cwd .` và dựa **exit code**.
