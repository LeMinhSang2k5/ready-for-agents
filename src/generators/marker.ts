import { createHash } from "node:crypto";
import type { GeneratedFileMap, OutputFile } from "../types.js";
import { OUTPUT_FILES } from "../types.js";

const HTML_MARKER_PATTERN =
  /\n?<!-- ready-for-agents:generated file="([^"]+)" hash="([a-f0-9]+)" -->\s*$/u;
const HASH_MARKER_PATTERN =
  /\n?# ready-for-agents:generated file="([^"]+)" hash="([a-f0-9]+)"\s*$/u;

export type GeneratedMarker = {
  file: string;
  hash: string;
};

export function stripGeneratedMarker(content: string): string {
  return (
    content
      .replace(HTML_MARKER_PATTERN, "")
      .replace(HASH_MARKER_PATTERN, "")
      .replace(/\s+$/g, "") + "\n"
  );
}

export function hashGeneratedContent(content: string): string {
  return createHash("sha256")
    .update(stripGeneratedMarker(content), "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function readGeneratedMarker(content: string): GeneratedMarker | null {
  const match =
    content.match(HTML_MARKER_PATTERN) ?? content.match(HASH_MARKER_PATTERN);
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
  const marker =
    file.endsWith(".yml") || file.endsWith(".yaml")
      ? `# ready-for-agents:generated file="${file}" hash="${hash}"`
      : `<!-- ready-for-agents:generated file="${file}" hash="${hash}" -->`;
  return `${body}${marker}\n`;
}

export function addGeneratedMarkers<T extends GeneratedFileMap>(files: T): T {
  const marked = { ...files };
  for (const name of OUTPUT_FILES) {
    if (marked[name] !== undefined) {
      marked[name] = withGeneratedMarker(name, marked[name]!);
    }
  }
  return marked;
}
