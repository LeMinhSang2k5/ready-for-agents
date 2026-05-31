# Publish checklist — agent-context-kit

Checklist trước khi `npm publish` (hoặc `pnpm publish`). Chạy từ root repo.

---

## 1. Version & changelog

- [ ] Bump `version` in `package.json` (semver: patch / minor / major)
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
- [ ] `pnpm test` — pass (hiện ~60 tests)
- [ ] `pnpm run build` — `dist/` mới nhất (CLI đọc từ đây)

---

## 3. Smoke test CLI (local)

```bash
node dist/cli.js --version
node dist/cli.js init --help
node dist/cli.js doctor --help
node dist/cli.js doctor --json --cwd .
```

- [ ] `doctor` text mode in ra Checks + Score
- [ ] `doctor --json` in **một dòng JSON** parse được; `jq .` ok
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
tar -tzf agent-context-kit-*.tgz | head -30
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
  "url": "git+https://github.com/LeMinhSang2k5/AgentContextKit.git"
},
"homepage": "https://github.com/LeMinhSang2k5/AgentContextKit#readme",
"bugs": {
  "url": "https://github.com/LeMinhSang2k5/AgentContextKit/issues"
}
```

- [ ] `repository` / `homepage` đã khai báo (nếu public)
- [ ] Đăng nhập npm: `npm whoami`
- [ ] Tên package `agent-context-kit` còn trống hoặc bạn có quyền publish

---

## 7. Publish

```bash
# dry-run registry (optional)
npm publish --dry-run

# thật
npm publish --access public
```

- [ ] Xác nhận trên https://www.npmjs.com/package/agent-context-kit
- [ ] `npx agent-context-kit@X.Y.Z doctor --json` từ máy sạch (hoặc CI)

---

## 8. Sau publish

- [ ] GitHub Release notes (copy từ CHANGELOG)
- [ ] Cập nhật [doc/guide/README.md](./doc/guide/README.md) nếu đổi test count / features
- [ ] Roadmap trong README — đánh dấu item đã ship

---

## CI gate gợi ý (consumer repos)

```yaml
- run: npx agent-context-kit doctor --json --cwd .
- run: test "$(jq -e '.ok == true' < doctor.json)"  # nếu redirect stdout
```

Hoặc chỉ: `npx agent-context-kit doctor --json --cwd .` và dựa **exit code**.
