import { createHash } from "node:crypto";
import type { GeneratedFiles, OutputFile } from "../types.js";
import { OUTPUT_FILES } from "../types.js";

const MARKER_PATTERN =
  /\n?<!-- agent-context-kit:generated file="([^"]+)" hash="([a-f0-9]+)" -->\s*$/u;

export type GeneratedMarker = {
  file: string;
  hash: string;
};

export function stripGeneratedMarker(content: string): string {
  return content.replace(MARKER_PATTERN, "").replace(/\s+$/g, "") + "\n";
}

export function hashGeneratedContent(content: string): string {
  return createHash("sha256")
    .update(stripGeneratedMarker(content), "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function readGeneratedMarker(content: string): GeneratedMarker | null {
  const match = content.match(MARKER_PATTERN);
  if (!match) return null;
  return {
    file: match[1]!,
    hash: match[2]!,
  };
}

export function hasGeneratedMarker(
  content: string,
  file?: OutputFile,
): boolean {
  const marker = readGeneratedMarker(content);
  if (!marker) return false;
  if (file && marker.file !== file) return false;
  return marker.hash === hashGeneratedContent(content);
}

export function withGeneratedMarker(file: OutputFile, content: string): string {
  const body = stripGeneratedMarker(content);
  const hash = hashGeneratedContent(body);
  return `${body}<!-- agent-context-kit:generated file="${file}" hash="${hash}" -->\n`;
}

export function addGeneratedMarkers(files: GeneratedFiles): GeneratedFiles {
  const marked = { ...files };
  for (const name of OUTPUT_FILES) {
    if (marked[name] !== undefined) {
      marked[name] = withGeneratedMarker(name, marked[name]!);
    }
  }
  return marked;
}
