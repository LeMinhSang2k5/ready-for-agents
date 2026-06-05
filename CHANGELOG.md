# Changelog

All notable changes to **ready-for-agents** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-06-05

### Added

- **`config init`** — create `.ready-for-agents.json` project defaults
  - Configure optional file presets, `prompt.target`, and index output path
  - Legacy `.agent-context-kit.json` is still read for compatibility
- **`index`** — build `.ready-for-agents/context-tree.json`
  - Includes generated file hashes, Markdown sections, anchors, keywords, commands, summaries, importance, and token estimates
  - Supports `--dry-run`, `--json`, `--output`, and `--cwd`
- **`query`** — select relevant generated context sections for a task
  - Uses context tree cache when present, falls back to live generated file scan
  - Supports `--json`, `--limit`, `--tree`, and `--cwd`
- **`prompt --context --compact`** — build short prompts with relevant context sections from the context tree
  - `ready-for-agents p "..."` defaults to context + compact
  - `rfa` binary alias supports `rfa p "..."`
- `init`, `update`, and `doctor --fix` can generate the context tree cache via config or `--index`
- `prompt --cwd` reads project config for `prompt.target`, `prompt.context`, `prompt.style`, and `prompt.contextLimit`
- Tests: `config-index.test.ts`, `query.test.ts`, `prompt-context.test.ts`

### Changed

- Generated `AGENTS.md`, `PROJECT_CONTEXT.md`, and `COMMANDS.md` now include tree/query-first guidance for AI agents.
- README now shows explicit GitHub and npm links for the npm package page.
- Public API exports now include config, context tree, query, and prompt context helpers.

## [0.2.0] - 2026-06-02

### Added

- **`prompt`** — turn rough instructions into structured agent-ready prompts (no AI API)
  - Sections: Task, Context, Requirements, Constraints, Verify, Unclear, Response (omit empty sections)
  - Intents: `explain`, `review`, `fix`, `verify`, `clarify`, `general`
  - `--stdin`, `--file`, interactive mode (TTY), `--json`, `--stats`
  - `--target auto|en|vi` for response language instruction
- **`update`** — refresh generated context files after repo changes
  - `--check` — verify freshness without writing
  - `--json` — machine-readable output for CI
  - Marker/hash support to skip user-authored files by default
  - `--force` — overwrite untracked existing output files
- **`doctor --fix`** — generate missing context files and refresh stale generated files safely
  - `--dry-run` and `--json` for preview and automation
- **`init --cursor`** / **`init --claude`** / **`init --all`** — optional `.cursor/rules/ready-for-agents.mdc` and `CLAUDE.md` generators
- **`doctor --fix`** supports `--cursor`, `--claude`, `--all` presets
- Spec: `doc/guide/PROMPT_SPEC.md`, `doc/guide/PROMPT_EXAMPLES.md`
- Tests: `prompt.test.ts`, `prompt-examples.test.ts`, `prompt-quality.test.ts`

### Changed

- **npm package renamed** from `agent-context-kit` to **`ready-for-agents`** (CLI binary `ready-for-agents`; the unscoped name on npm is owned by another account)
- Generated marker and Cursor rule path: `ready-for-agents:generated`, `.cursor/rules/ready-for-agents.mdc`
- `prompt` pipeline refactored into `segment`, `classify`, `extract`, `render` modules
- Doctor and update workflows aligned with generated-file markers

### Security

- No network or AI API calls in core CLI paths (`prompt` remains rule-based)

## [0.1.0] - 2026-06-01

### Added

- **`init`** — scan Node.js project and generate `AGENTS.md`, `PROJECT_CONTEXT.md`, `COMMANDS.md`
- **`init --dry-run`** — full preview without writing files
- **`init --force`** — overwrite existing context files
- **`init --cwd <path>`** — scan another project directory
- **`doctor`** — static readiness checks (package.json, context files, scripts, README)
- **`doctor --json`** — machine-readable JSON on stdout for CI (`cwd`, `ok`, `score`, `checks`)
- **`doctor --cwd <path>`** — check another project directory
- Doctor **fail-fast** when `--cwd` is missing or not a directory
- Detection: package manager (lockfile → `packageManager` field → npm fallback), stack layers, script aliases, root folders
- Safe writes: skip existing output files unless `--force`
- Spec docs under `doc/guide/` (requirements, CLI, data model, architecture, ADRs)
- `tests/generators.test.ts` — guard Markdown spacing and trailing newlines

### Security

- No network or AI API calls in core CLI paths

[Unreleased]: https://github.com/LeMinhSang2k5/ready-for-agents/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/LeMinhSang2k5/ready-for-agents/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/LeMinhSang2k5/ready-for-agents/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/LeMinhSang2k5/ready-for-agents/releases/tag/v0.1.0
