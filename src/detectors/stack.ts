import type { ProjectStack, StackLayer } from "../types.js";

type Deps = Record<string, string>;

type StackRule = {
  deps: string[];
  label: string;
};

const FRONTEND_RULES: StackRule[] = [
  { deps: ["next"], label: "Next.js" },
  { deps: ["nuxt"], label: "Nuxt" },
  { deps: ["vite", "react"], label: "React/Vite" },
  { deps: ["vite", "vue"], label: "Vue/Vite" },
  { deps: ["react-scripts"], label: "React (CRA)" },
  { deps: ["react"], label: "React" },
  { deps: ["vue"], label: "Vue" },
  { deps: ["svelte"], label: "Svelte" },
];

const BACKEND_RULES: StackRule[] = [
  { deps: ["@nestjs/core"], label: "NestJS" },
  { deps: ["express"], label: "Express" },
  { deps: ["fastify"], label: "Fastify" },
  { deps: ["koa"], label: "Koa" },
  { deps: ["hono"], label: "Hono" },
];

const DATABASE_RULES: StackRule[] = [
  { deps: ["mongoose"], label: "MongoDB/Mongoose" },
  { deps: ["mongodb"], label: "MongoDB" },
  { deps: ["@prisma/client"], label: "Prisma" },
  { deps: ["prisma"], label: "Prisma" },
  { deps: ["typeorm"], label: "TypeORM" },
  { deps: ["pg"], label: "PostgreSQL" },
  { deps: ["mysql2"], label: "MySQL" },
  { deps: ["better-sqlite3"], label: "SQLite" },
  { deps: ["ioredis"], label: "Redis" },
  { deps: ["redis"], label: "Redis" },
];

function hasDeps(all: Deps, names: string[]): boolean {
  return names.every((name) => all[name] !== undefined);
}

function pickLayer(all: Deps, rules: StackRule[]): StackLayer | undefined {
  for (const rule of rules) {
    if (hasDeps(all, rule.deps)) {
      return { label: rule.label, source: [...rule.deps] };
    }
  }
  return undefined;
}

export function detectStack(
  dependencies: Deps,
  devDependencies: Deps,
): ProjectStack {
  const all = { ...dependencies, ...devDependencies };
  const stack: ProjectStack = {};

  const frontend = pickLayer(all, FRONTEND_RULES);
  const backend = pickLayer(all, BACKEND_RULES);
  const database = pickLayer(all, DATABASE_RULES);

  if (frontend) stack.frontend = frontend;
  if (backend) stack.backend = backend;
  if (database) stack.database = database;

  return stack;
}

export function stackLayerLabel(
  layer: StackLayer | undefined,
): string | undefined {
  return layer?.label;
}

/** e.g. "React/Vite + Express" */
export function stackFrameworkSummary(stack: ProjectStack): string {
  const parts = [stack.frontend?.label, stack.backend?.label].filter(Boolean);
  if (parts.length === 0) {
    return "Node.js";
  }
  return parts.join(" + ");
}

export function stackDatabaseSummary(stack: ProjectStack): string | undefined {
  return stack.database?.label;
}

export function isStackEmpty(stack: ProjectStack): boolean {
  return !stack.frontend && !stack.backend && !stack.database;
}

export function formatStackLayerSources(layer: StackLayer | undefined): string {
  if (!layer) {
    return "Not detected";
  }
  return layer.source.map((d) => `\`${d}\``).join(", ");
}
