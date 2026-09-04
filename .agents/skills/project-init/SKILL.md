---
name: project-init
description: Turn a repo cloned from this template into a named project. Asks the developer, through the harness's own question tool, for the project name and purpose, where the requirements live, the unit type, the stack and the Jira project, and records the answers in MEMORY.md, README.md and docs/agents/issue-tracker.md. Use when a project starts, when MEMORY.md is missing, or when the stack or Jira project changes.
disable-model-invocation: true
---

# Project init

The template knows nothing about the project it hosts. This skill asks the developer for the facts no file derives and writes them where every agent and every skill will look: `MEMORY.md` (read first, per `AGENTS.md`), the `Project` section of `README.md`, and the Jira key and site in `docs/agents/issue-tracker.md`. Nothing runs and nothing is scaffolded: you ask with your harness's question tool (Claude Code `AskUserQuestion`, OpenCode `question`, Cursor and Copilot ask in chat) and write the files with your edit tool, so it works the same on every OS.

## Steps

1. **Check for a previous run.** If `MEMORY.md` exists, show its facts and ask which ones change; the rest keep their current values. Done when you know whether this is a first run or an update, and which values you still need.

2. **Interview**, one question at a time, in this order, with the harness's question tool. Offer options where the table lists them and free text otherwise. Push back on a vague answer the way `grilling` would; each value ends up in a file another agent will act on.

   | Ask | Fact | Accept only |
   | --- | --- | --- |
   | What is the project called? | Name | A name usable as a heading and as a folder (`Acme Billing`) |
   | What does it do, in one sentence, for whom? | Purpose | One sentence with a subject, an outcome and a user |
   | Where do the requirements live? | Requirements | One or more sources, comma-separated: a repo-relative path that exists, a URL, or `jira:KEY-123`; `none yet` is allowed and means the `brd` skill runs next |
   | What kind of unit is it? | Unit type | Options: `library`, `cli`, `service`, `monolith`, `frontend` |
   | Which language? | Language | One language (`C#`, `TypeScript`, `Python`) |
   | Which runtime and package manager? | Runtime / package manager | Version included (`.NET 9 / NuGet`, `Node 22 / pnpm`, `Python 3.13 / uv`) |
   | Which Jira site? | Jira site | `https://<org>.atlassian.net` |
   | Which Jira project key? | Jira key | Upper case, as Jira shows it (`AB`); with the Atlassian MCP authorised, offer the keys `listJiraProjects` returns as options |

   Done when every fact is a specific string that passes its "accept only" column.

3. **Write `MEMORY.md`** at the repo root from this template, one fact per line. On an update, replace the changed lines and leave the file otherwise as it is.

   ```md
   # Project memory

   Facts about this project that no file in the repo derives. Written by the `project-init` skill; edit by hand when they change, one fact per line.

   - **Name:** <name>
   - **Purpose:** <purpose>
   - **Requirements:** <requirements>
   - **Unit type:** <unit type>
   - **Language:** <language>
   - **Runtime / package manager:** <runtime>
   - **Jira:** <jira site>, project `<KEY>` (conventions in `docs/agents/issue-tracker.md`)
   ```

   Done when the file holds exactly these seven facts.

4. **Write the `Project` section of `README.md`.** Insert it before the first `## ` heading, between the two marker comments below; on an update, replace everything between the markers. Leave the rest of the README alone.

   ```md
   <!-- project-init:start -->
   ## Project

   **<name>**: <purpose>

   | Fact | Value |
   | --- | --- |
   | Requirements | <requirements> |
   | Unit type | <unit type> |
   | Stack | <language>, <runtime> |
   | Issue tracker | Jira project `<KEY>` at <jira site> (conventions in `docs/agents/issue-tracker.md`) |

   The same facts are in `MEMORY.md`, which agents read first. Re-run the `project-init` skill to change them.
   <!-- project-init:end -->
   ```

   Done when the README has one marker pair and the table matches `MEMORY.md`.

5. **Update `docs/agents/issue-tracker.md`.** Replace every occurrence of the current key (`TODO-PROJECT-KEY` on a first run, the previous key on an update) with `<KEY>`, including the JQL examples and the bare-reference rule. Make the key line read exactly `**Project key:** \`<KEY>\`` with the placeholder note removed, and put `**Site:** <jira site>` on the line under it (replace the existing `Site` line on an update). Done when the file mentions no other key and both lines are present.

6. **Remember, in your harness too.** If your harness keeps persistent memory (Claude Code auto-memory), save one `project` memory saying that the project facts live in `MEMORY.md` at the repo root and repeating the name, stack and Jira key, so they are in context before the repo is read. Skip this in a harness without memory. Done when the memory exists or the harness has none.

7. **Hand over the scaffold.** Read `scripts/stacks.tsv` and take the scaffold column of the row for the stack; replace `{Name}` with the PascalCase project name, `{name}` with the kebab-case one, and `{template}` with the unit type's template (`classlib`, `console`, `webapi` or `blazor` for .NET by library, cli, service or monolith and frontend; `--lib` for a Python library, `--app --package` otherwise). Give the developer the commands as a code block, one per line. Do not run them: scaffolding is the developer's call and a separate step. For a stack with no row, add one to `scripts/stacks.tsv` (triggers, needs, restore, scaffold) so the post-merge hook restores it too, and point at `src/README.md` and `tests/README.md`. Done when the developer has the commands and the table has a row for the stack.

8. **Close the loop.** Ask the developer to commit (`git add -A`, then a commit such as `initialise <name>`). If Requirements was `none yet`, hand off to the `brd` skill; otherwise point out that the `business-analyst` agent can start the documentation chain from the requirements location now on record. The post-merge Git hook restores whatever `scripts/stacks.tsv` says for the changed manifests, so the row added in step 7 is all it needs.

## Report

The seven facts recorded, which files changed, the scaffold commands handed over, and the next skill to run.

## Gotchas

- Ask one question per turn: a single message with eight questions gets eight half-answers.
- `Requirements` is checked by `node scripts/docs-check.js`, so a Confluence page goes in as its URL and an epic as `jira:AB-42`, not as prose. List several by separating them with commas. Once a BRD exists the line names the BRD instead, and the `brd` skill makes that swap.
- The Jira key is upper case and the site a full URL; a lower-case key or a bare host name silently breaks the JQL in `issue-tracker.md`.
- On an update, the old key must go everywhere in `issue-tracker.md`, including inside JQL strings and the `<KEY>-42` example; search for it before declaring the step done.
- Change values through the skill, never by editing between the README markers: the next run replaces everything inside them.
