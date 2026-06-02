# Đặc tả lệnh `prompt`

**Mục tiêu:** Biến instruction thô thành prompt gọn, có cấu trúc, sẵn sàng cho AI agent — **không gọi AI API** ở MVP.

> Turn rough instructions into compact, structured agent-ready prompts.

---

## 1. Output sections

| Section                           | Nội dung                                  |
| --------------------------------- | ----------------------------------------- |
| **Task**                          | Hành động chính agent phải làm            |
| **Context**                       | Phạm vi / fact user **đã nói rõ**         |
| **Requirements**                  | Những gì user muốn được trả lời / bao gồm |
| **Constraints**                   | Quy tắc, giới hạn, điều agent phải tránh  |
| **Verify**                        | Lệnh hoặc check agent nên chạy            |
| **Unclear / Needs Clarification** | Chi tiết thiếu hoặc mơ hồ                 |
| **Response**                      | Cách agent trả lời lại                    |

**Quy tắc render:** section nào rỗng thì **không in**.

### Nguyên tắc

1. Không bịa capability.
2. Không tự thêm fact nếu user không nói (Context chỉ từ input).
3. Không chắc → **Unclear**.
4. Câu hỏi → prompt yêu cầu agent **giải thích**, không tự trả lời thay agent.
5. Task code → **Verify** khi phù hợp.
6. Giữ intent gốc của user.

---

## 2. CLI

| Lệnh                                     | Mô tả                        |
| ---------------------------------------- | ---------------------------- |
| `agent-context-kit prompt "<text>"`      | Instruction từ argument      |
| `agent-context-kit prompt --stdin`       | Đọc stdin                    |
| `agent-context-kit prompt --file <path>` | Đọc file                     |
| `agent-context-kit prompt`               | Interactive (TTY) hoặc stdin |

| Flag                      | Mô tả                                       |
| ------------------------- | ------------------------------------------- |
| `--target <auto\|en\|vi>` | Chọn instruction ngôn ngữ cho phần Response |
| `--json`                  | JSON thay Markdown                          |
| `--stats`                 | Stats ra stderr                             |

Exit: `0` OK · `1` input rỗng sau normalize hoặc `--target` không hợp lệ.

### Target language

`--target` là rule-based, không gọi model dịch.

| Value  | Hành vi                                                                         |
| ------ | ------------------------------------------------------------------------------- |
| `auto` | Mặc định; detect tiếng Việt trong input thì Response yêu cầu trả lời tiếng Việt |
| `en`   | Response yêu cầu trả lời tiếng Anh                                              |
| `vi`   | Response yêu cầu trả lời tiếng Việt                                             |

Lưu ý: MVP chưa dịch toàn bộ `Task`, `Requirements`, `Constraints` sang target language. Flag này tập trung vào instruction ngôn ngữ để agent trả lời đúng hướng.

---

## 3. Pipeline

```text
readPromptInput → normalizePromptText → segmentPromptText
  → classifyPromptIntent → extractPromptBrief → renderPromptBrief
```

### Module map

| File           | Vai trò                                                |
| -------------- | ------------------------------------------------------ |
| `input.ts`     | argument / stdin / file / interactive                  |
| `normalize.ts` | whitespace, filler an toàn                             |
| `segment.ts`   | tách câu; bảo vệ `package.json`                        |
| `classify.ts`  | intent: explain, review, fix, verify, clarify, general |
| `extract.ts`   | `PromptBrief` từ segments + intent                     |
| `render.ts`    | Markdown / JSON; bỏ section rỗng                       |
| `stats.ts`     | char reduction, token estimate                         |

**Sau MVP:** `compare`, `plan`, `implement`.

---

## 4. Data model

```ts
type PromptIntent =
  | "explain"
  | "review"
  | "fix"
  | "verify"
  | "clarify"
  | "general";

type PromptBrief = {
  source: PromptSource;
  target: "auto" | "en" | "vi";
  original: string;
  intent: PromptIntent;
  task: string;
  context: string[];
  requirements: string[];
  constraints: string[];
  verify: string[];
  unclear: string[];
  response: string[];
  stats: PromptStats;
};
```

---

## 5. Ví dụ

### Explain (câu hỏi về `prompt`)

**Input:**

```text
Vì sao tôi nên có tính prompt này, hãy hướng dẫn tôi sử dụng tính năng này, cấu trúc của nó như thế nào?
```

**Output (rút gọn):**

- **Task:** Explain why the `prompt` feature is useful, how to use it, and how it is structured.
- **Context:** User asks about `prompt`; grounded in their project.
- **Requirements:** why useful · how to use · output structure · grounded in project.
- **Constraints:** do not invent capabilities; state limitations; rule-based.
- **Response:** Answer in Vietnamese with concrete examples.

### Target English

**Input:**

```bash
agent-context-kit prompt --target en "sửa lỗi doctor --json giúp tôi"
```

**Output signal:**

- **Response:** Answer in English with concrete examples.

### Clarify (mơ hồ)

**Input:** `làm cái này tốt hơn`

- **Task:** Improve the requested item.
- **Unclear:** Which item? What does “better” mean?
- **Response:** Ask concise clarification questions before making changes.

---

## 6. Roadmap

| Version | Item                                                   |
| ------- | ------------------------------------------------------ |
| v0.2    | `--style`, `--file` polish                             |
| v0.3    | `--ai` rewrite, `compare`, `plan`, `implement` intents |
