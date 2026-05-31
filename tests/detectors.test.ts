import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { detectImportantFolders } from "../src/detectors/folders.js";
import { detectPackageManager } from "../src/detectors/package-manager.js";
import { detectStack, stackFrameworkSummary } from "../src/detectors/stack.js";
import {
  findRelatedScripts,
  formatScriptListForTerminal,
  sortScriptNamesForDisplay,
  parseScriptRefsFromCommand,
  pickCommonScripts,
} from "../src/detectors/scripts.js";
import { readProject } from "../src/fs/read-project.js";
import { generateAllFiles } from "../src/generators/index.js";
import { formatTestingExpectations } from "../src/generators/testing-expectations.js";
import { writeGeneratedFiles } from "../src/fs/write-files.js";

const tempDirs: string[] = [];

function makeFixture(name: string, files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), `ack-${name}-`));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("detectPackageManager", () => {
  it("detects pnpm from pnpm-lock.yaml", () => {
    const dir = makeFixture("pnpm", {
      "pnpm-lock.yaml": "lockfileVersion: 9\n",
      "package.json": "{}",
    });
    expect(detectPackageManager(dir)).toBe("pnpm");
  });

  it("detects npm from package-lock.json", () => {
    const dir = makeFixture("npm", {
      "package-lock.json": "{}",
      "package.json": "{}",
    });
    expect(detectPackageManager(dir)).toBe("npm");
  });
});

describe("detectStack", () => {
  it("detects full-stack React/Vite + Express + Mongoose", () => {
    const stack = detectStack(
      {
        vite: "^6.0.0",
        react: "^19.0.0",
        express: "^4.0.0",
        mongoose: "^8.0.0",
      },
      {},
    );
    expect(stack.frontend?.label).toBe("React/Vite");
    expect(stack.frontend?.source).toEqual(["vite", "react"]);
    expect(stack.backend?.label).toBe("Express");
    expect(stack.database?.label).toBe("MongoDB/Mongoose");
    expect(stackFrameworkSummary(stack)).toBe("React/Vite + Express");
  });

  it("detects Next.js only", () => {
    const stack = detectStack({ next: "15.0.0" }, {});
    expect(stack.frontend?.label).toBe("Next.js");
    expect(stack.backend).toBeUndefined();
  });

  it("falls back to empty stack", () => {
    expect(detectStack({}, {})).toEqual({});
  });
});

describe("pickCommonScripts", () => {
  it("maps common script names", () => {
    expect(
      pickCommonScripts({
        dev: "vite",
        build: "tsc",
        test: "vitest run",
      }),
    ).toEqual({
      dev: { scriptName: "dev", command: "vite" },
      build: { scriptName: "build", command: "tsc" },
      test: { scriptName: "test", command: "vitest run" },
    });
  });
});

describe("parseScriptRefsFromCommand", () => {
  it("does not treat pnpm install as a script", () => {
    expect(parseScriptRefsFromCommand("pnpm install && pnpm run dev")).toEqual([
      "dev",
    ]);
  });

  it("does not treat yarn add as a script", () => {
    expect(parseScriptRefsFromCommand("yarn add lodash && yarn dev")).toEqual([
      "dev",
    ]);
  });

  it("parses npm run dev:client", () => {
    expect(
      parseScriptRefsFromCommand('concurrently "npm run dev:client"'),
    ).toEqual(["dev:client"]);
  });
});

describe("sortScriptNamesForDisplay", () => {
  it("orders dev before build and dev: variants after dev", () => {
    const scripts = {
      build: "vite build",
      dev: "concurrently npm run dev:client npm run dev:server",
      "dev:client": "vite",
      "dev:server": "node server.js",
    };
    expect(
      sortScriptNamesForDisplay(scripts, [
        "build",
        "dev",
        "dev:server",
        "dev:client",
      ]),
    ).toEqual(["dev", "dev:client", "dev:server", "build"]);
    expect(formatScriptListForTerminal(scripts)).toBe(
      "dev, dev:client, dev:server, build",
    );
  });
});

describe("findRelatedScripts", () => {
  it("finds dev:* scripts and refs inside dev command", () => {
    const scripts = {
      dev: 'concurrently "npm run dev:client" "npm run dev:server"',
      "dev:client": "vite",
      "dev:server": "tsx server/index.ts",
      build: "vite build",
    };
    expect(findRelatedScripts(scripts, "dev")).toEqual([
      "dev:client",
      "dev:server",
    ]);
    expect(formatScriptListForTerminal(scripts)).toContain("dev:client");
    expect(formatScriptListForTerminal(scripts)).toContain("dev:server");
  });
});

describe("readProject", () => {
  it("reads next.js fixture", () => {
    const dir = makeFixture("next", {
      "package.json": JSON.stringify({
        name: "my-app",
        scripts: { dev: "next dev", build: "next build", test: "vitest" },
        dependencies: { next: "15.0.0", react: "19.0.0" },
      }),
      "pnpm-lock.yaml": "",
      "src/index.ts": "export {}",
      "README.md": "# hi",
    });
    const ctx = readProject(dir);
    expect(ctx.name).toBe("my-app");
    expect(ctx.packageManager).toBe("pnpm");
    expect(ctx.stack.frontend?.label).toBe("Next.js");
    expect(ctx.folders).toContain("src");
    expect(ctx.scripts.dev).toBe("next dev");
  });
});

describe("testing expectations", () => {
  it("suggests build when no test script", () => {
    const dir = makeProjectScripts({
      build: "vite build",
    });
    const ctx = readProject(dir);
    expect(formatTestingExpectations(ctx)).toContain("npm run build");
  });
});

function makeProjectScripts(scripts: Record<string, string>): string {
  return makeFixture("scripts", {
    "package.json": JSON.stringify({ name: "app", scripts }),
  });
}

describe("init write behavior", () => {
  it("does not overwrite without force", () => {
    const dir = makeFixture("write", {
      "package.json": JSON.stringify({ name: "x", scripts: {} }),
      "AGENTS.md": "keep",
    });
    const files = generateAllFiles(readProject(dir));
    const result = writeGeneratedFiles(dir, files, { force: false });
    expect(result.skipped).toContain("AGENTS.md");
    expect(result.created).not.toContain("AGENTS.md");
    expect(result.overwritten).not.toContain("AGENTS.md");
  });

  it("overwrites with force", () => {
    const dir = makeFixture("force", {
      "package.json": JSON.stringify({ name: "x", scripts: {} }),
      "AGENTS.md": "old",
    });
    const files = generateAllFiles(readProject(dir));
    const result = writeGeneratedFiles(dir, files, { force: true });
    expect(result.overwritten).toContain("AGENTS.md");
  });
});

describe("generateAllFiles", () => {
  it("includes required section headers and related dev scripts", () => {
    const dir = makeFixture("gen", {
      "package.json": JSON.stringify({
        name: "demo",
        scripts: {
          dev: 'concurrently "npm run dev:client" "npm run dev:server"',
          "dev:client": "vite",
          "dev:server": "node server.js",
          build: "vite build",
        },
        dependencies: {
          vite: "6",
          react: "19",
          express: "4",
          mongoose: "8",
        },
      }),
      "src/main.ts": "export {}",
    });
    const files = generateAllFiles(readProject(dir));
    expect(files["AGENTS.md"]).toContain("## Project Goal");
    expect(files["AGENTS.md"]).toContain("Framework: **React/Vite + Express**");
    expect(files["AGENTS.md"]).toContain("Database: **MongoDB/Mongoose**");
    expect(files["AGENTS.md"]).toMatch(/### Important Folders\n\n- `src\/`/);
    expect(files["COMMANDS.md"]).toMatch(
      /```\n\n## Related Development Scripts/,
    );
    expect(files["COMMANDS.md"]).toContain("npm run dev:client");
    expect(files["COMMANDS.md"]).not.toMatch(/\n{3,}$/);
    expect(files["COMMANDS.md"]).toContain("npm run dev:server");
    expect(files["PROJECT_CONTEXT.md"]).toContain("### Backend");
    expect(files["PROJECT_CONTEXT.md"]).toContain("Detected from dependencies");
    expect(files["PROJECT_CONTEXT.md"]).toContain(
      "Backend dependencies were detected",
    );
  });
});
