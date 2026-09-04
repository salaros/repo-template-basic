# Repo template

Language-agnostic repository template: layout, Git hooks, and an agent harness. There is no product code yet; whatever lands in `src/` defines the stack.

## Layout

Each folder's README says what belongs in it and how it is organised: `src/`, `tests/`, `scripts/`, `tools/`, `docs/`. Read the one for the folder you are about to touch.

## Documentation

The `docs/` folder contains all the relevant information. Depending on the scope of this repo it will store either documentation for a single library, module, microservice or an entire monolith.
This repo and its skills can be used to crack down business requirements in order to develop a prototype of even an MVP.

The following documentation pipeline should be followed:
BRD → PRD → EARS → BDD → ADR → SPEC → TDD → IPLAN → Code

## Skills

Skills live in `.agents/skills/<name>/SKILL.md`, vendored by `npx skills` and recorded in `skills-lock.json`. If your harness has not surfaced them, read the `description` line of each `SKILL.md` and load the ones that match the task. The `engineer` agent (`.agents/agents/engineer.md`) routes a task through them.

Skills are vendored: add or update them with `npx skills` (then `sh scripts/skills-relink.sh`) instead of editing them in place.

## Agent skills

### Issue tracker

Jira, through the Atlassian MCP server. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default role names as plain Jira labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the root. See `docs/agents/domain.md`.

### Coding standards

`CODING_STANDARDS.md`, read by `code-review` only. Whitespace, encoding, line endings and analyzer severities are enforced by `.editorconfig`, `.gitattributes` and the stack's own tool configs at the root, not restated there.

## Domain language

`CONTEXT.md` holds the glossary and `docs/adr/` the decisions. Both are created lazily by the `domain-modeling` skill; use their terms when they exist.

## Working here

- Install the Git hooks once per clone: `sh scripts/githooks-init.sh`.
- Hook scripts for agent harnesses are in `.agents/hooks/`; a blocked command means the guard there fired, so ask the user rather than working around it.
