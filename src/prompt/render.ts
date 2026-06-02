import type {
  PromptBrief,
  PromptJsonOutput,
  PromptRenderFormat,
} from "./types.js";

const UNCLEAR_HEADING = "Unclear / Needs Clarification";

function renderMarkdownSection(
  title: string,
  lines: string[],
  bullet: boolean,
): string {
  if (lines.length === 0) return "";
  const body = bullet
    ? lines.map((l) => `- ${l}`).join("\n")
    : lines.join("\n");
  return `## ${title}\n\n${body}`;
}

export function renderPromptBrief(
  brief: PromptBrief,
  format: PromptRenderFormat,
): string {
  if (format === "json") {
    return JSON.stringify(toPromptJson(brief), null, 2);
  }

  const sections: string[] = [`## Task\n\n${brief.task}`];

  const optional: Array<{ title: string; lines: string[] }> = [
    { title: "Context", lines: brief.context },
    { title: "Requirements", lines: brief.requirements },
    { title: "Constraints", lines: brief.constraints },
    { title: "Verify", lines: brief.verify },
    { title: UNCLEAR_HEADING, lines: brief.unclear },
  ];

  for (const { title, lines } of optional) {
    const block = renderMarkdownSection(title, lines, true);
    if (block) sections.push(block);
  }

  if (brief.response.length > 0) {
    const responseBody =
      brief.response.length === 1
        ? brief.response[0]
        : brief.response.map((r) => `- ${r}`).join("\n");
    sections.push(`## Response\n\n${responseBody}`);
  }

  return sections.join("\n\n") + "\n";
}

export function toPromptJson(brief: PromptBrief): PromptJsonOutput {
  return {
    target: brief.target,
    intent: brief.intent,
    task: brief.task,
    context: brief.context,
    requirements: brief.requirements,
    constraints: brief.constraints,
    verify: brief.verify,
    unclear: brief.unclear,
    response: brief.response,
  };
}
