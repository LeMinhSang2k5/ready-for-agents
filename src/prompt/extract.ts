import { classifyPromptIntent } from "./classify.js";
import { extractCommands, segmentPromptText } from "./segment.js";
import type {
  PromptBrief,
  PromptIntent,
  PromptSource,
  PromptTarget,
} from "./types.js";

const CONSTRAINT_CUE =
  /(?:^|\s)(không|đừng|tránh|không được)(?=\s|$|[,.])|\b(avoid|don't|do not|never)\b/i;
const VERIFY_SEGMENT_PATTERN =
  /\b(test|typecheck|type-check|build|verify|pnpm|npm|yarn|bun|vitest|jest|chạy)\b/i;

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hasConstraintCue(text: string): boolean {
  return CONSTRAINT_CUE.test(text);
}

export function extractFeatureLabel(text: string): string | null {
  if (/\b(promt|prompt)\b/i.test(text)) return "`prompt`";
  if (/\bdoctor\b/i.test(text)) return "`doctor`";
  if (/\binit\b/i.test(text)) return "`init`";
  if (/\brfa\b/i.test(text)) return "`rfa`";
  if (/\bready-for-agents\b/i.test(text)) return "`ready-for-agents`";
  return null;
}

function extractUserContext(text: string): string[] {
  const context: string[] = [];
  const feature = extractFeatureLabel(text);
  if (feature) {
    context.push(`The user is asking about the ${feature} feature.`);
  }
  if (/\brfa\b/i.test(text)) {
    context.push("The user mentioned `rfa`.");
  } else if (/\bready-for-agents\b/i.test(text)) {
    context.push("The user mentioned `ready-for-agents`.");
  }
  if (/(project|của tôi|repo|repository)/iu.test(text)) {
    context.push("The user wants the answer grounded in their project.");
  }
  return context;
}

function explainBehaviorConstraints(): string[] {
  return [
    "Do not invent facts or capabilities.",
    "State limitations clearly.",
    "Keep the system rule-based.",
  ];
}

function safetyConstraints(): string[] {
  return [
    "Do not invent facts or capabilities.",
    "If information is missing, put it in Unclear / Needs Clarification.",
    "Preserve the user's original intent.",
  ];
}

function responseLanguageInstruction(
  text: string,
  target: PromptTarget,
): string {
  if (target === "en") return "Answer in English with concrete examples.";
  if (target === "vi") return "Trả lời bằng tiếng Việt với ví dụ cụ thể.";
  if (
    /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/iu.test(
      text,
    )
  ) {
    return "Answer in Vietnamese with concrete examples.";
  }
  return "Answer in the same language as the user's question.";
}

function buildExplainRequirements(text: string): string[] {
  const requirements: string[] = [];
  if (/(?:vì sao|tại sao|why|nên có|should i|useful|lợi ích)/iu.test(text)) {
    requirements.push("Explain why this feature is useful.");
  }
  if (/(?:hướng dẫn|cách dùng|cách sử dụng|how to use)/iu.test(text)) {
    requirements.push("Explain how to use it.");
  }
  if (/cấu trúc|structure/i.test(text)) {
    requirements.push("Describe the output structure.");
  }
  if (/(?:như thế nào|là gì|what is|tác dụng|hoạt động)/iu.test(text)) {
    if (!requirements.some((r) => /how to use/i.test(r))) {
      requirements.push("Explain how it works and what it does.");
    }
  }
  if (/(project|của tôi|repo)/iu.test(text)) {
    requirements.push("Keep the explanation grounded in this project.");
  }
  if (requirements.length === 0 && text.includes("?")) {
    requirements.push("Answer everything the user asked.");
  }
  return requirements;
}

function buildExplainTask(text: string): string {
  const feature = extractFeatureLabel(text);
  const subject = feature ? `the ${feature} feature` : "the requested topic";
  const parts: string[] = [];
  if (/(?:vì sao|tại sao|why|nên có|should i|useful)/iu.test(text)) {
    parts.push(`why ${subject} is useful`);
  }
  if (/(?:hướng dẫn|cách dùng|cách sử dụng|how to use)/iu.test(text)) {
    parts.push("how to use it");
  }
  if (/cấu trúc|structure/i.test(text)) {
    parts.push("how it is structured");
  }
  if (parts.length === 0) {
    return `Explain ${subject} in this project.`;
  }
  if (parts.length === 1) {
    return `Explain ${parts[0]}.`;
  }
  const last = parts.pop()!;
  return `Explain ${parts.join(", ")}, and ${last}.`;
}

function buildClarifyUnclear(text: string): string[] {
  const unclear: string[] = [];
  if (/(?:nó|it).+(?:hoạt động chính xác|works correctly)/iu.test(text)) {
    unclear.push("Which feature or command should be verified?");
  }
  if (/(?:cái này|nó|đó|this|it)\b/iu.test(text)) {
    unclear.push("Which item should be improved?");
  }
  if (/\b(tốt hơn|better|improve)\b/i.test(text)) {
    unclear.push(
      'What does "better" mean: accuracy, speed, UX, output quality, or something else?',
    );
  }
  if (unclear.length === 0) {
    unclear.push("What is the exact scope of the requested change?");
    unclear.push("What does success look like?");
  }
  return unclear;
}

function extractReviewTask(text: string, commands: string[]): string {
  const primary = commands[0];
  if (primary) return `Review \`${primary}\`.`;
  if (/readme/iu.test(text) && /publish/iu.test(text)) {
    return "Review README publish readiness.";
  }
  if (/readme/iu.test(text)) return "Review README.";
  if (/prompt parser/iu.test(text)) return "Review the prompt parser.";
  if (/src\/prompt/iu.test(text)) return "Review the `src/prompt` structure.";
  if (/doc\/guide/iu.test(text))
    return "Review `doc/guide` against the current project.";
  if (/roadmap/iu.test(text))
    return "Review the roadmap against the MVP scope.";
  if (/changelog/iu.test(text)) return "Review CHANGELOG.md.";
  if (/package\.json/iu.test(text)) return "Review package.json.";
  if (/\b(source code|codebase|repo)\b/i.test(text)) {
    return "Review the current source code.";
  }
  return "Review the requested scope.";
}

function extractReviewRequirements(text: string, commands: string[]): string[] {
  const requirements: string[] = [];
  if (commands.length > 0)
    requirements.push("Check behavior and output format.");
  if (/publish/iu.test(text)) requirements.push("Check publish readiness.");
  if (/false positives?/iu.test(text)) {
    requirements.push("Identify false positives and related risks.");
  }
  if (/thiếu|missing/iu.test(text))
    requirements.push("Identify missing cases.");
  if (/spacing|formatting/iu.test(text)) {
    requirements.push("Check formatting and spacing.");
  }
  if (/giữ đúng ý|preserve/i.test(text)) {
    requirements.push("Check whether the output preserves the user's intent.");
  }
  return requirements;
}

function extractFixTask(text: string, commands: string[]): string {
  const primary = commands[0];
  if (primary) return `Fix issues related to \`${primary}\`.`;
  if (/command extraction/iu.test(text)) return "Fix command extraction.";
  if (/spacing/iu.test(text)) return "Fix Markdown spacing.";
  if (/fallback label/iu.test(text)) return "Fix fallback label wording.";
  if (/doctor.+json|json.+doctor/iu.test(text)) {
    return "Fix doctor JSON output.";
  }
  if (/package manager detection/iu.test(text)) {
    return "Fix package manager detection.";
  }
  if (/docs?|readme/iu.test(text)) return "Fix stale documentation.";
  if (/validate.+cwd|cwd.+validate/iu.test(text)) return "Fix cwd validation.";
  return "Fix the reported issues.";
}

function extractFixRequirements(text: string): string[] {
  const requirements = ["Fix the issue without expanding scope."];
  if (/shell command fake|fake shell command/iu.test(text)) {
    requirements.push(
      "Prevent Vietnamese text from being converted into a fake shell command.",
    );
  }
  if (/không biến|do not|don't|prevent/iu.test(text)) {
    requirements.push("Preserve the stated negative condition.");
  }
  if (/json/iu.test(text))
    requirements.push("Keep JSON output machine-readable.");
  if (/không tồn tại|missing|does not exist/iu.test(text)) {
    requirements.push("Handle missing resources with a clear error.");
  }
  return requirements;
}

function extractConstraintsFromSegments(segments: string[]): string[] {
  return segments
    .filter((s) => hasConstraintCue(s))
    .map((s) => capitalizeFirst(s) + (s.endsWith(".") ? "" : "."));
}

function extractVerifyFromSegments(
  segments: string[],
  commands: string[],
): string[] {
  const verify: string[] = [];
  for (const segment of segments) {
    if (!VERIFY_SEGMENT_PATTERN.test(segment)) continue;
    for (const cmd of extractCommands(segment)) {
      verify.push(`Run \`${cmd}\`.`);
    }
    if (/typecheck/i.test(segment)) verify.push("Run typecheck.");
    if (/\btest\b/i.test(segment)) verify.push("Run tests.");
    if (/\bbuild\b/i.test(segment)) verify.push("Run build.");
  }
  for (const cmd of commands) {
    if (!verify.some((v) => v.includes(cmd))) {
      verify.push(`Run \`${cmd}\`.`);
    }
  }
  return [...new Set(verify)];
}

function defaultVerifyForCodeTask(
  commands: string[],
  intent: PromptIntent,
): string[] {
  if (intent === "explain" || intent === "clarify") return [];
  const items: string[] = [];
  const hasPnpm = /\bpnpm\b/i.test(commands.join(" "));
  if (commands.length > 0) {
    return extractVerifyFromSegments([], commands);
  }
  if (intent === "review" || intent === "fix" || intent === "general") {
    if (hasPnpm) {
      return ["Run `pnpm typecheck`.", "Run `pnpm test`.", "Run `pnpm build`."];
    }
    return ["Run typecheck, tests, and build if code changes."];
  }
  return items;
}

function buildBriefForIntent(
  intent: PromptIntent,
  text: string,
  segments: string[],
  commands: string[],
  target: PromptTarget,
): Omit<
  PromptBrief,
  | "source"
  | "target"
  | "style"
  | "original"
  | "relevantContext"
  | "contextSource"
  | "contextTreePath"
  | "stats"
> {
  const userConstraints = extractConstraintsFromSegments(segments);

  switch (intent) {
    case "explain": {
      return {
        intent,
        task: buildExplainTask(text),
        context: extractUserContext(text),
        requirements: buildExplainRequirements(text),
        constraints: [...explainBehaviorConstraints(), ...userConstraints],
        verify: [],
        unclear: [],
        response: [responseLanguageInstruction(text, target)],
      };
    }
    case "clarify": {
      return {
        intent,
        task: "Improve the requested item.",
        context: extractUserContext(text),
        requirements: [],
        constraints: [...safetyConstraints(), ...userConstraints],
        verify: [],
        unclear: buildClarifyUnclear(text),
        response: [
          "Ask concise clarification questions before making changes.",
        ],
      };
    }
    case "verify": {
      const feature = extractFeatureLabel(text) ?? "`doctor`";
      const verifyTarget = commands[0] ? `\`${commands[0]}\`` : feature;
      return {
        intent,
        task: `Describe how to verify ${verifyTarget} works correctly.`,
        context: extractUserContext(text),
        requirements: [
          `Identify checks, commands, and expected outputs for ${verifyTarget}.`,
        ],
        constraints: [...explainBehaviorConstraints(), ...userConstraints],
        verify: extractVerifyFromSegments(segments, commands),
        unclear: [],
        response: [
          "Provide concise steps and expected verification signals.",
          responseLanguageInstruction(text, target),
        ],
      };
    }
    case "review": {
      return {
        intent,
        task: extractReviewTask(text, commands),
        context: extractUserContext(text),
        requirements: extractReviewRequirements(text, commands),
        constraints: [...safetyConstraints(), ...userConstraints],
        verify: [
          ...extractVerifyFromSegments(segments, commands),
          ...defaultVerifyForCodeTask(commands, intent),
        ],
        unclear: [],
        response: ["Summarize findings, verification, and remaining risks."],
      };
    }
    case "fix": {
      return {
        intent,
        task: extractFixTask(text, commands),
        context: extractUserContext(text),
        requirements: extractFixRequirements(text),
        constraints: [...safetyConstraints(), ...userConstraints],
        verify: [
          ...extractVerifyFromSegments(segments, commands),
          ...defaultVerifyForCodeTask(commands, intent),
        ],
        unclear: [],
        response: ["Summarize changes, verification, and remaining risks."],
      };
    }
    case "general": {
      const unclear: string[] = [];
      if (
        text.split(/\s+/).length <= 8 &&
        !text.includes("?") &&
        !/^(?:create|draft|design|write|propose|convert|tạo|viết|lập kế hoạch|lên kế hoạch|đề xuất)\b/iu.test(
          text,
        )
      ) {
        unclear.push("What is the exact scope of the requested work?");
      }
      return {
        intent,
        task: text.includes("?")
          ? buildExplainTask(text)
          : capitalizeFirst(text.slice(0, 200)) +
            (text.length > 200 ? "…" : "."),
        context: extractUserContext(text),
        requirements: text.includes("?") ? buildExplainRequirements(text) : [],
        constraints: [...safetyConstraints(), ...userConstraints],
        verify: extractVerifyFromSegments(segments, commands),
        unclear,
        response: text.includes("?")
          ? [responseLanguageInstruction(text, target)]
          : ["Summarize changes and verification."],
      };
    }
  }
}

export function extractPromptBrief(
  normalized: string,
  source: PromptSource,
  originalRaw?: string,
  target: PromptTarget = "auto",
): PromptBrief {
  const original = originalRaw ?? normalized;
  const segments = segmentPromptText(normalized);
  const commands = extractCommands(normalized);
  const intent = classifyPromptIntent(normalized, segments);
  const body = buildBriefForIntent(
    intent,
    normalized,
    segments,
    commands,
    target,
  );

  return {
    source,
    target,
    style: "standard",
    original,
    relevantContext: [],
    ...body,
    verify: [...new Set(body.verify)],
    requirements: [...new Set(body.requirements)],
    constraints: [...new Set(body.constraints)],
    context: [...new Set(body.context)],
    unclear: [...new Set(body.unclear)],
    stats: {
      originalChars: original.length,
      outputChars: 0,
      charReductionPercent: 0,
    },
  };
}
