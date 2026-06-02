import { describe, expect, it } from "vitest";
import { buildPromptFromText } from "../src/commands/prompt.js";

function briefFor(text: string) {
  const result = buildPromptFromText(text);
  expect(result).not.toBeNull();
  return result!.brief;
}

describe("prompt output quality", () => {
  it("builds a concrete verify brief for doctor correctness", () => {
    const brief = briefFor(
      "làm sao để biết tính năng doctor hoạt động chính xác?",
    );

    expect(brief.intent).toBe("verify");
    expect(brief.task).toMatch(/doctor/i);
    expect(brief.requirements.join(" ")).toMatch(
      /checks.+commands.+expected outputs/i,
    );
    expect(brief.response.join(" ")).toMatch(/Vietnamese/i);
    expect(brief.task).not.toContain("doctor ho");
  });

  it("keeps init dry-run verification focused on init", () => {
    const brief = briefFor(
      "Verify that `init --dry-run` does not write files.",
    );

    expect(brief.intent).toBe("verify");
    expect(brief.task).toContain("`init --dry-run`");
    expect(brief.requirements.join(" ")).toMatch(/expected outputs/i);
    expect(brief.verify.join(" ")).toContain("init --dry-run");
  });

  it("extracts all explicit verification commands", () => {
    const brief = briefFor("chạy pnpm typecheck và pnpm test và pnpm build");

    expect(brief.intent).toBe("verify");
    expect(brief.verify).toEqual(
      expect.arrayContaining([
        "Run `pnpm typecheck`.",
        "Run `pnpm test`.",
        "Run `pnpm build`.",
      ]),
    );
  });

  it("describes explain requirements for the prompt feature", () => {
    const brief = briefFor(
      "Vì sao tôi nên có tính prompt này, hãy hướng dẫn tôi sử dụng tính năng này, cấu trúc của nó như thế nào?",
    );

    expect(brief.intent).toBe("explain");
    expect(brief.task).toMatch(/why the `prompt` feature is useful/i);
    expect(brief.task).toMatch(/how to use it/i);
    expect(brief.task).toMatch(/structured/i);
    expect(brief.requirements).toEqual(
      expect.arrayContaining([
        "Explain why this feature is useful.",
        "Explain how to use it.",
        "Describe the output structure.",
      ]),
    );
    expect(brief.constraints).toContain("Keep the system rule-based.");
  });

  it("makes README review output concrete", () => {
    const brief = briefFor("bạn xem README này đã đủ để publish chưa");

    expect(brief.intent).toBe("review");
    expect(brief.task).toMatch(/README/i);
    expect(brief.requirements.join(" ")).toMatch(/publish/i);
    expect(brief.response.join(" ")).toMatch(/findings/i);
  });

  it("makes prompt parser audits focus on risks", () => {
    const brief = briefFor("Audit the prompt parser for false positives.");

    expect(brief.intent).toBe("review");
    expect(brief.task).toMatch(/prompt parser/i);
    expect(brief.requirements.join(" ")).toMatch(/false positives/i);
    expect(brief.constraints).toContain("Do not invent facts or capabilities.");
  });

  it("makes fix output name the affected feature", () => {
    const brief = briefFor(
      "sửa command extraction để không biến tiếng Việt thành shell command fake",
    );

    expect(brief.intent).toBe("fix");
    expect(brief.task).toMatch(/command extraction/i);
    expect(brief.requirements.join(" ")).toMatch(
      /fake shell command|shell command fake/i,
    );
    expect(brief.verify.join(" ")).toMatch(/typecheck|tests|build/i);
  });

  it("preserves user constraints", () => {
    const brief = briefFor("review api. đừng sửa package.json. chạy pnpm test");

    expect(brief.intent).toBe("review");
    expect(brief.constraints.join(" ")).toMatch(/package\.json/i);
    expect(brief.verify).toContain("Run `pnpm test`.");
  });

  it("asks clarification questions for vague improvement prompts", () => {
    const brief = briefFor("làm cái này tốt hơn");

    expect(brief.intent).toBe("clarify");
    expect(brief.unclear).toEqual(
      expect.arrayContaining([
        "Which item should be improved?",
        'What does "better" mean: accuracy, speed, UX, output quality, or something else?',
      ]),
    );
    expect(brief.verify).toHaveLength(0);
  });

  it("asks for missing feature context in vague verification prompts", () => {
    const brief = briefFor("làm sao để biết nó hoạt động chính xác");

    expect(brief.intent).toBe("clarify");
    expect(brief.unclear.join(" ")).toMatch(
      /which feature|what should be verified/i,
    );
  });

  it("keeps broad creation prompts as general tasks", () => {
    const brief = briefFor("Create a publish checklist for version 0.1.0.");

    expect(brief.intent).toBe("general");
    expect(brief.task).toMatch(/publish checklist/i);
    expect(brief.unclear).toHaveLength(0);
    expect(brief.response).toContain("Summarize changes and verification.");
  });
});
