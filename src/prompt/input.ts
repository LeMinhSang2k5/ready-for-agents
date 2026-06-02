import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stdin as input } from "node:process";
import type { PromptOptions, PromptSource } from "./types.js";

export type PromptInputResult = {
  source: PromptSource;
  raw: string;
};

export type PromptInputError = {
  error: string;
};

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export async function readPromptInput(
  options: PromptOptions,
): Promise<PromptInputResult | PromptInputError | null> {
  const selectedSources = [
    options.text !== undefined ? "argument" : null,
    options.stdin ? "stdin" : null,
    options.file ? "file" : null,
  ].filter(Boolean);

  if (selectedSources.length > 1) {
    return {
      error: "Use only one prompt input source: argument, --stdin, or --file.",
    };
  }

  if (options.text !== undefined && options.text.trim() !== "") {
    return { source: "argument", raw: options.text };
  }

  if (options.stdin) {
    const raw = await readStdin();
    return { source: "stdin", raw };
  }

  if (options.file) {
    const path = resolve(options.file);
    try {
      const raw = readFileSync(path, "utf-8");
      return { source: "file", raw };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Cannot read prompt file: ${path}. ${message}` };
    }
  }

  if (options.text !== undefined) {
    return { source: "argument", raw: options.text };
  }

  // Interactive mode if stdin is a terminal, otherwise fallback to stdin
  if (process.stdin.isTTY) {
    process.stderr.write("Enter your instruction. Finish with Ctrl+D:\n\n> ");
    const raw = await readStdin();
    return { source: "interactive", raw };
  } else {
    const raw = await readStdin();
    return { source: "stdin", raw };
  }
}
