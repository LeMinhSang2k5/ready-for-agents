import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { OutputFile, ProjectContext } from "../types.js";
import { OUTPUT_FILES } from "../types.js";

export type ContextTreeSection = {
  id: string;
  heading: string;
  slug: string;
  anchor: string;
  level: number;
  lineStart: number;
  lineEnd: number;
  hash: string;
  words: number;
  tokensEstimate: number;
  keywords: string[];
  commands: string[];
  importance: "high" | "medium" | "low";
  summary: string;
};

export type ContextTreeFile = {
  path: OutputFile;
  kind: "core" | "cursor" | "claude" | "copilot" | "ci";
  exists: boolean;
  hash?: string;
  bytes?: number;
  tokensEstimate: number;
  sections: ContextTreeSection[];
};

export type ContextTree = {
  version: 1;
  tool: "ready-for-agents";
  project: {
    name: string;
    cwd: string;
    packageManager: string;
  };
  summary: {
    filesIndexed: number;
    filesMissing: number;
    sectionsIndexed: number;
    tokensEstimate: number;
  };
  files: ContextTreeFile[];
};

export function buildContextTree(ctx: ProjectContext): ContextTree {
  const files = OUTPUT_FILES.map((path) => indexFile(ctx.cwd, path));
  return {
    version: 1,
    tool: "ready-for-agents",
    project: {
      name: ctx.name,
      cwd: ctx.cwd,
      packageManager: ctx.packageManager,
    },
    summary: summarizeTree(files),
    files,
  };
}

export function writeContextTree(outputPath: string, tree: ContextTree): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(tree, null, 2)}\n`, "utf-8");
}

export function resolveIndexOutput(cwd: string, output: string): string {
  return resolve(cwd, output);
}

function indexFile(cwd: string, path: OutputFile): ContextTreeFile {
  const fullPath = join(cwd, path);
  if (!existsSync(fullPath)) {
    return {
      path,
      kind: fileKind(path),
      exists: false,
      tokensEstimate: 0,
      sections: [],
    };
  }

  const content = readFileSync(fullPath, "utf-8");
  const sections = parseMarkdownSections(path, content);
  return {
    path,
    kind: fileKind(path),
    exists: true,
    hash: hashText(content),
    bytes: Buffer.byteLength(content, "utf-8"),
    tokensEstimate: sections.reduce(
      (total, section) => total + section.tokensEstimate,
      0,
    ),
    sections,
  };
}

function parseMarkdownSections(
  file: OutputFile,
  content: string,
): ContextTreeSection[] {
  const lines = content.split(/\r?\n/u);
  const headings = lines
    .map((line, index) => {
      const match = /^(#{1,6})\s+(.+?)\s*$/u.exec(line);
      if (!match) return null;
      return {
        level: match[1]!.length,
        heading: stripMarkdown(match[2]!),
        lineStart: index + 1,
        index,
      };
    })
    .filter(
      (heading): heading is NonNullable<typeof heading> => heading !== null,
    );

  if (headings.length === 0 && content.trim() !== "") {
    return [
      makeSection(file, "document", "Document", 1, 1, lines.length, content),
    ];
  }

  return headings.map((heading, index) => {
    const next = headings[index + 1];
    const lineEnd = next ? next.index : lines.length;
    const body = lines.slice(heading.index, lineEnd).join("\n");
    return makeSection(
      file,
      `${heading.heading}-${heading.lineStart}`,
      heading.heading,
      heading.level,
      heading.lineStart,
      lineEnd,
      body,
    );
  });
}

function makeSection(
  file: OutputFile,
  idSeed: string,
  heading: string,
  level: number,
  lineStart: number,
  lineEnd: number,
  body: string,
): ContextTreeSection {
  const sectionSlug = slug(heading);
  const words = countWords(body);
  return {
    id: `${slug(file)}.${slug(idSeed)}`,
    heading,
    slug: sectionSlug,
    anchor: `#${sectionSlug}`,
    level,
    lineStart,
    lineEnd,
    hash: hashText(body),
    words,
    tokensEstimate: estimateTokensFromWords(words),
    keywords: extractKeywords(`${file}\n${heading}\n${body}`),
    commands: extractCommands(body),
    importance: inferImportance(file, heading, body),
    summary: summarizeSection(body, heading),
  };
}

function summarizeSection(body: string, fallback: string): string {
  const line = body
    .split(/\r?\n/u)
    .map((item) => stripMarkdown(item).trim())
    .find((item) => item !== "" && !item.startsWith("#"));
  return truncate(line ?? fallback, 160);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/<!--.*?-->/gu, "")
    .replace(/[`*_~>#-]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function estimateTokensFromWords(words: number): number {
  return Math.max(1, Math.ceil(words * 1.3));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function slug(text: string): string {
  const value = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
  return value || "section";
}

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

function summarizeTree(files: ContextTreeFile[]): ContextTree["summary"] {
  return {
    filesIndexed: files.filter((file) => file.exists).length,
    filesMissing: files.filter((file) => !file.exists).length,
    sectionsIndexed: files.reduce(
      (total, file) => total + file.sections.length,
      0,
    ),
    tokensEstimate: files.reduce(
      (total, file) => total + file.tokensEstimate,
      0,
    ),
  };
}

function fileKind(path: OutputFile): ContextTreeFile["kind"] {
  if (path === ".cursor/rules/ready-for-agents.mdc") return "cursor";
  if (path === "CLAUDE.md") return "claude";
  if (path === ".github/copilot-instructions.md") return "copilot";
  if (path === ".github/workflows/ready-for-agents.yml") return "ci";
  return "core";
}

const KEYWORD_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "should",
  "unless",
  "project",
  "ready",
  "agents",
  "agent",
  "files",
  "file",
  "generated",
  "detected",
  "khong",
  "trong",
  "nhung",
  "duoc",
  "dung",
  "cho",
]);

function extractKeywords(text: string, limit = 14): string[] {
  const counts = new Map<string, number>();
  for (const token of searchTokens(text)) {
    if (KEYWORD_STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function extractCommands(text: string, limit = 8): string[] {
  const commands = new Set<string>();
  const fencedCommand = /```(?:bash|sh|shell)?\n([\s\S]*?)```/giu;
  for (const block of text.matchAll(fencedCommand)) {
    for (const line of block[1]!.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (looksLikeCommand(trimmed)) {
        commands.add(trimmed);
      }
    }
  }

  const inlineCommand =
    /`((?:npm|pnpm|yarn|bun|npx|rfa|ready-for-agents)\s+[^`]+)`/giu;
  for (const match of text.matchAll(inlineCommand)) {
    commands.add(match[1]!.trim());
  }

  return [...commands].slice(0, limit);
}

function looksLikeCommand(line: string): boolean {
  return /^(?:npm|pnpm|yarn|bun|npx|node|tsx|tsc|vitest|rfa|ready-for-agents)\b/u.test(
    line,
  );
}

function inferImportance(
  file: OutputFile,
  heading: string,
  body: string,
): ContextTreeSection["importance"] {
  const text = `${file} ${heading} ${body}`.toLowerCase();
  if (
    /\b(project goal|how to work|important rules|testing expectations|stack|package manager|development|build|test|lint|typecheck|agent context)\b/u.test(
      text,
    )
  ) {
    return "high";
  }
  if (/\b(dependencies|database|framework|notes|format|setup)\b/u.test(text)) {
    return "medium";
  }
  return "low";
}

function searchTokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, " ")
    .split(/\s+/u)
    .filter((token) => token.length >= 2);
}
