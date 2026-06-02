# Yêu cầu phi chức năng (Non-Functional Requirements)

---

## NFR-1 — Hiệu năng

| ID      | Yêu cầu                                                | Cách đáp ứng                                           |
| ------- | ------------------------------------------------------ | ------------------------------------------------------ |
| NFR-1-1 | `doctor` hoàn thành trong vài giây trên project thường | Chỉ thao tác sync FS cố định; không đọc `node_modules` |
| NFR-1-2 | `init` không quét recursive repo                       | Chỉ detect folder cố định ở root                       |
| NFR-1-3 | Không spawn child process cho detect                   | Pure Node `fs` + `JSON.parse`                          |

**Không đảm bảo:** project có `package.json` cực lớn (> vài MB) vẫn đọc full vào memory.

---

## NFR-2 — Tương thích

| ID      | Yêu cầu                                         |
| ------- | ----------------------------------------------- |
| NFR-2-1 | Node.js **≥ 18**                                |
| NFR-2-2 | ESM (`"type": "module"`)                        |
| NFR-2-3 | macOS, Linux, Windows (path qua `node:path`)    |
| NFR-2-4 | Project target: Node.js với `package.json` root |

---

## NFR-3 — Bảo mật & an toàn

| ID      | Yêu cầu                                                  |
| ------- | -------------------------------------------------------- |
| NFR-3-1 | Không thực thi script trong `package.json`               |
| NFR-3-2 | Không upload source ra ngoài                             |
| NFR-3-3 | `--dry-run` không ghi disk                               |
| NFR-3-4 | Mặc định không ghi đè file user đã chỉnh (cần `--force`) |
| NFR-3-5 | Không đọc `.env` / secrets (không nằm trong spec detect) |

---

## NFR-4 — Độ tin cậy

| ID      | Yêu cầu                                                                       |
| ------- | ----------------------------------------------------------------------------- |
| NFR-4-1 | Exit code nhất quán (0 success, 1 validation/critical fail/skipped untracked) |
| NFR-4-2 | Message lỗi cwd/package.json rõ ràng                                          |
| NFR-4-3 | `doctor` fail-fast cwd — tránh false signal                                   |

---

## NFR-5 — Khả năng bảo trì

| ID      | Yêu cầu                                    |
| ------- | ------------------------------------------ |
| NFR-5-1 | TypeScript strict; `pnpm typecheck` pass   |
| NFR-5-2 | Detect rules tách module `detectors/`      |
| NFR-5-3 | Generators pure function `(ctx) => string` |
| NFR-5-4 | Tài liệu `doc/guide/` đồng bộ với behavior |

---

## NFR-6 — Khả năng mở rộng (giới hạn hiện tại)

| Khía cạnh | Giới hạn MVP                         |
| --------- | ------------------------------------ |
| Ngôn ngữ  | Chỉ Node.js ecosystem                |
| Monorepo  | Không detect workspace con tự động   |
| Config    | Không file `.agent-context-kit.json` |
| i18n CLI  | English output only                  |

---

## NFR-7 — Phụ thuộc runtime

| Package      | Vai trò                    |
| ------------ | -------------------------- |
| `commander`  | CLI parsing                |
| `picocolors` | Terminal màu (init/doctor) |

Dev: `typescript`, `vitest`, `tsx`, `prettier` — không ship vào user install (chỉ `dist/` + prod deps).

---

## NFR-8 — Quan sát & debug

- Không structured logging / telemetry.
- Debug: chạy `pnpm dev` + breakpoint tại `readProject`, `generateAllFiles`, `runDoctorChecks`.
- User-facing errors: stderr (init validation) hoặc check lines (doctor).
