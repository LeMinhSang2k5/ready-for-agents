import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildPromptFromText, runPrompt } from "../src/commands/prompt.js";
import { classifyPromptIntent } from "../src/prompt/classify.js";
import { normalizePromptText } from "../src/prompt/normalize.js";
import { segmentPromptText } from "../src/prompt/segment.js";
import { renderPromptBrief } from "../src/prompt/render.js";
import { extractPromptBrief } from "../src/prompt/extract.js";
import { formatStatsLine } from "../src/prompt/stats.js";

describe("normalizePromptText", () => {
  it("normalizes whitespace", () => {
    expect(normalizePromptText("  hello   world  \n\n\nfoo  ")).toBe(
      "hello world\n\nfoo",
    );
  });

  it("removes obvious filler without deleting meaning", () => {
    const input = "bạn hãy kiểm tra doctor --json giúp tôi nhé";
    const out = normalizePromptText(input);
    expect(out).toContain("kiểm tra");
    expect(out).toContain("doctor --json");
    expect(out).not.toMatch(/giúp tôi/i);
  });
});

describe("segmentPromptText", () => {
  it("does not split package.json on the dot", () => {
    const segments = segmentPromptText(
      "review api. đừng sửa package.json. chạy test",
    );
    expect(segments.some((s) => s.includes("package.json"))).toBe(true);
  });
});

describe("buildPromptFromText", () => {
  it("reads prompt from argument pipeline (review)", () => {
    const result = buildPromptFromText("kiểm tra doctor --json");
    expect(result).not.toBeNull();
    expect(result!.brief.intent).toBe("review");
    expect(result!.brief.task).toMatch(/Review/i);
    expect(result!.brief.task).toContain("doctor --json");
    expect(result!.output).toContain("## Verify");
    expect(result!.brief.constraints).toContain(
      "Do not invent facts or capabilities.",
    );
  });

  it("structures explain questions with Context and Requirements", () => {
    const result = buildPromptFromText(
      "Vì sao tôi nên có tính prompt này, hãy hướng dẫn tôi sử dụng tính năng này, cấu trúc của nó như thế nào?",
    );
    expect(result!.brief.intent).toBe("explain");
    expect(result!.brief.task).toMatch(
      /Explain why the `prompt` feature is useful, how to use it, and how it is structured/,
    );
    expect(result!.output).toContain("## Context");
    expect(result!.output).toContain("## Requirements");
    expect(result!.output).not.toContain("## Focus");
    expect(result!.output).not.toContain("Vì sao tôi nên có");
    expect(result!.brief.verify).toHaveLength(0);
    expect(result!.brief.response[0]).toMatch(/Vietnamese/i);
    expect(result!.brief.constraints).toContain(
      "Do not invent facts or capabilities.",
    );
  });

  it("can force English response instructions with target en", () => {
    const result = buildPromptFromText(
      "Vì sao tôi nên có tính prompt này?",
      "argument",
      "markdown",
      "en",
    );

    expect(result!.brief.target).toBe("en");
    expect(result!.brief.response).toContain(
      "Answer in English with concrete examples.",
    );
  });

  it("can force Vietnamese response instructions with target vi", () => {
    const result = buildPromptFromText(
      "Explain what prompt does.",
      "argument",
      "markdown",
      "vi",
    );

    expect(result!.brief.target).toBe("vi");
    expect(result!.brief.response).toContain(
      "Trả lời bằng tiếng Việt với ví dụ cụ thể.",
    );
  });

  it("handles vague clarify prompts", () => {
    const result = buildPromptFromText("làm cái này tốt hơn");
    expect(result!.brief.intent).toBe("clarify");
    expect(result!.brief.task).toBe("Improve the requested item.");
    expect(result!.output).toContain("## Unclear / Needs Clarification");
    expect(result!.brief.unclear.some((u) => /Which item/i.test(u))).toBe(true);
    expect(result!.brief.response[0]).toMatch(/clarification/i);
  });

  it("classifies doctor how-to as verify intent", () => {
    const result = buildPromptFromText(
      "làm sao để biết tính năng doctor hoạt động chính xác ?",
    );
    expect(result!.brief.intent).toBe("verify");
    expect(result!.output).not.toContain("doctor ho");
    expect(result!.brief.task).toContain("`doctor`");
    expect(result!.brief.requirements.length).toBeGreaterThan(0);
  });

  it("extracts verify commands", () => {
    const result = buildPromptFromText(
      "review code. chạy pnpm typecheck và pnpm test và pnpm build",
    );
    expect(result!.brief.verify.join(" ")).toMatch(/typecheck/i);
    expect(result!.brief.verify.join(" ")).toMatch(/test/i);
  });

  it("renders JSON parseable with new schema", () => {
    const result = buildPromptFromText(
      "kiểm tra doctor --json",
      "argument",
      "json",
    );
    const parsed = JSON.parse(result!.output) as {
      intent: string;
      task: string;
      context: string[];
      requirements: string[];
    };
    expect(parsed.intent).toBe("review");
    expect(parsed.task).toBeTruthy();
    expect(Array.isArray(parsed.context)).toBe(true);
    expect(Array.isArray(parsed.requirements)).toBe(true);
  });

  it("renders target in JSON output", () => {
    const result = buildPromptFromText(
      "Explain what prompt does.",
      "argument",
      "json",
      "vi",
    );
    const parsed = JSON.parse(result!.output) as {
      target: string;
      response: string[];
    };

    expect(parsed.target).toBe("vi");
    expect(parsed.response).toContain(
      "Trả lời bằng tiếng Việt với ví dụ cụ thể.",
    );
  });

  it("omits empty sections in markdown", () => {
    const result = buildPromptFromText("kiểm tra doctor --json");
    expect(result!.output).not.toContain("## Unclear");
    expect(result!.output).not.toContain("## Context\n\n\n");
  });

  it("output shorter than input for filler-heavy prompt", () => {
    const filler =
      "tôi muốn bạn kiểm tra source code hiện tại và bạn hãy xem doctor --json giúp tôi nhé nếu được. ";
    const raw = filler.repeat(6);
    const result = buildPromptFromText(raw);
    expect(result!.brief.stats.outputChars).toBeLessThan(raw.length);
  });

  it("returns null for empty input", () => {
    expect(buildPromptFromText("   ")).toBeNull();
    expect(buildPromptFromText("giúp tôi nhé")).toBeNull();
  });
});

describe("extractPromptBrief constraints", () => {
  it("puts avoid phrases into constraints", () => {
    const brief = extractPromptBrief(
      "review api. đừng sửa package.json. chạy test",
      "argument",
    );
    expect(brief.constraints.some((c) => /package\.json/i.test(c))).toBe(true);
  });
});

describe("classifyPromptIntent", () => {
  it("detects clarify before general", () => {
    expect(classifyPromptIntent("làm cái này tốt hơn", [])).toBe("clarify");
  });
});

describe("runPrompt", () => {
  it("returns exit 1 for empty input", async () => {
    const code = await runPrompt({ text: "   " });
    expect(code).toBe(1);
  });

  it("prints markdown to stdout", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });
    const code = await runPrompt({ text: "kiểm tra doctor --json" });
    vi.restoreAllMocks();
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("## Task");
  });

  it("prints JSON to stdout", async () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });
    const code = await runPrompt({
      text: "kiểm tra doctor --json",
      json: true,
    });
    vi.restoreAllMocks();

    const parsed = JSON.parse(logs.join("\n")) as {
      intent: string;
      task: string;
      constraints: string[];
    };
    expect(code).toBe(0);
    expect(parsed.intent).toBe("review");
    expect(parsed.task).toContain("doctor --json");
    expect(parsed.constraints).toContain(
      "Do not invent facts or capabilities.",
    );
  });

  it("returns exit 1 for invalid target", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((msg: string) => {
      errors.push(msg);
    });
    const code = await runPrompt({ text: "review code", target: "jp" });
    vi.restoreAllMocks();

    expect(code).toBe(1);
    expect(errors.join("\n")).toContain("Invalid --target value");
  });

  it("returns exit 1 when multiple input sources are provided", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((msg: string) => {
      errors.push(msg);
    });
    const code = await runPrompt({ text: "review code", stdin: true });
    vi.restoreAllMocks();

    expect(code).toBe(1);
    expect(errors.join("\n")).toContain("Use only one prompt input source");
  });

  it("returns exit 1 with clear message when file cannot be read", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((msg: string) => {
      errors.push(msg);
    });
    const code = await runPrompt({ file: join(tmpdir(), "missing-task.txt") });
    vi.restoreAllMocks();

    expect(code).toBe(1);
    expect(errors.join("\n")).toContain("Cannot read prompt file");
  });

  it("reads prompt from file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ack-prompt-file-"));
    const filePath = join(dir, "task.txt");
    writeFileSync(filePath, "sửa lỗi doctor --json giúp tôi nhé");
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(msg);
    });
    const code = await runPrompt({ file: filePath });
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
    expect(code).toBe(0);
    expect(logs.join("\n")).toContain("## Task");
  });
});

describe("renderPromptBrief", () => {
  it("omits empty constraints-only when none from user", () => {
    const brief = extractPromptBrief("fix bug", "argument");
    const md = renderPromptBrief(brief, "markdown");
    expect(brief.constraints.length).toBeGreaterThanOrEqual(0);
    if (brief.constraints.length === 0) {
      expect(md).not.toContain("## Constraints");
    }
  });
});

describe("formatStatsLine", () => {
  it("does not describe longer output as shorter", () => {
    const line = formatStatsLine({
      originalChars: 10,
      outputChars: 40,
      charReductionPercent: -300,
      estimatedTokens: 10,
    });
    expect(line).toContain("300% longer");
    expect(line).not.toContain("-300% shorter");
  });
});
