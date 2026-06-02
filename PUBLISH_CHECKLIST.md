# Publish checklist — ready-for-agents

Checklist trước khi `npm publish` (hoặc `pnpm publish`). Chạy từ root repo.

---

## 1. Version & changelog

- [ ] Bump `version` in `package.json` (semver: patch / minor / major) — hiện **0.2.0**
- [ ] Cập nhật [CHANGELOG.md](./CHANGELOG.md): chuyển mục `[Unreleased]` → `[x.y.z] - YYYY-MM-DD`
- [ ] Tag git: `git tag vX.Y.Z` (sau khi merge release)

---

## 2. Build & quality

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm run build
```

- [ ] `pnpm typecheck` — pass
- [ ] `pnpm test` — pass (hiện 247 tests)
- [ ] `pnpm run build` — `dist/` mới nhất (CLI đọc từ đây)

---

## 3. Smoke test CLI (local)

```bash
node dist/cli.js --version
node dist/cli.js init --help
node dist/cli.js update --help
node dist/cli.js doctor --help
node dist/cli.js prompt --help
node dist/cli.js doctor --json --cwd .
node dist/cli.js doctor --fix --dry-run --cwd .
node dist/cli.js update --check --json --cwd .
```

- [ ] `doctor` text mode in ra Checks + Score
- [ ] `doctor --json` in **một dòng JSON** parse được; `jq .` ok
- [ ] `doctor --fix --dry-run` in fix preview và không ghi file
- [ ] `update --check --json` in JSON parse được; exit `0` khi context current, exit `1` khi missing/outdated/untracked
- [ ] Exit `0` khi project pass/warn-only; exit `1` khi cwd sai hoặc thiếu `package.json`

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

- [ ] `dist/` (compiled JS + `.d.ts`)
- [ ] `doc/guide/` (specs; README links hoạt động trên npm)
- [ ] `CHANGELOG.md`
- [ ] `README.md`, `README.vi.md`, `LICENSE`, `package.json` (npm luôn đính kèm)

Không publish:

- [ ] `src/`, `tests/`, `.pnpm-store/` **không** nằm trong tarball (trừ khi cố ý đổi `files`)

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

- [ ] Không publish khi `build` fail
- [ ] Không dùng `--ignore-scripts` trừ khi đã build tay và hiểu rủi ro

---

## 6. npm registry metadata (khuyến nghị)

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

- [ ] `repository` / `homepage` đã khai báo (nếu public)
- [ ] Đăng nhập npm: `npm whoami`
- [ ] Tên package `ready-for-agents` còn trống hoặc bạn có quyền publish

---

## 7. Publish

```bash
# dry-run registry (optional)
npm publish --dry-run

# thật
npm publish --access public
```

- [ ] Xác nhận trên https://www.npmjs.com/package/ready-for-agents
- [ ] `npx ready-for-agents@X.Y.Z doctor --json` từ máy sạch (hoặc CI)

---

## 7b. Trusted Publisher (GitHub Actions → npm, khuyến nghị)

Workflow: [`.github/workflows/publish.yml`](./.github/workflows/publish.yml)

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

- [ ] GitHub Release notes (copy từ CHANGELOG)
- [ ] Cập nhật [doc/guide/README.md](./doc/guide/README.md) nếu đổi test count / features
- [ ] Roadmap trong README — đánh dấu item đã ship

---

## CI gate gợi ý (consumer repos)

```yaml
- run: npx ready-for-agents doctor --json --cwd .
- run: test "$(jq -e '.ok == true' < doctor.json)" # nếu redirect stdout
```

Hoặc chỉ: `npx ready-for-agents doctor --json --cwd .` và dựa **exit code**.
