# Repo template

Language-agnostic repository template: layout, Git hooks, and an agent harness. There is no product code yet; whatever lands in `src/` defines the stack.

## Layout

Each folder's README says what belongs in it and how it is organised: `src/`, `tests/`, `scripts/`, `tools/`, `docs/`. Read the one for the folder you are about to touch.

## Skills

Skills live in `.agents/skills/<name>/SKILL.md`, vendored from `skills.json` by `npx skills`. If your harness has not surfaced them, read the `description` line of each `SKILL.md` and load the ones that match the task. The `engineer` agent (`.agents/agents/engineer.md`) routes a task through them.

Skills are vendored: change `skills.json` and run `sh scripts/skills-install.sh` instead of editing them in place.

## Domain language

`CONTEXT.md` holds the glossary and `docs/adr/` the decisions. Both are created lazily by the `domain-modeling` skill; use their terms when they exist.

## Working here

- Install the Git hooks once per clone: `sh scripts/githooks-init.sh`.
- Hook scripts for agent harnesses are in `.agents/hooks/`; a blocked command means the guard there fired, so ask the user rather than working around it.
