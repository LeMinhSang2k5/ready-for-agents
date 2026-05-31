# Changelog

All notable changes to **agent-context-kit** are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (nothing yet)

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

[Unreleased]: https://github.com/LeMinhSang2k5/AgentContextKit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LeMinhSang2k5/AgentContextKit/releases/tag/v0.1.0
