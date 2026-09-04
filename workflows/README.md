# Workflows

Specs for recurring processes, one Markdown file per workflow, written by the `loop-me` skill. A spec is done when an implementer (human or agent) could build the workflow without asking a question: trigger, steps, where the human checkpoint sits, and what the brief at that checkpoint shows.

## Conventions

- One file per workflow: `workflows/<kebab-case-name>.md`.
- `loop-me` also keeps `NOTES.md` next to this folder's parent: the user's tools, channels and terminology. It reads that file before proposing anything, so keep it current.
- The `teach` skill uses the same `NOTES.md` name and treats its whole working directory as a teaching workspace. Run `teach` in a dedicated folder (for example `docs/learning/<topic>/`), not at the repo root, so the two do not read each other's notes.
