# Basic repo template

A starting point that does not assume a language or framework: `.gitignore`, `.gitattributes`, Git hooks, a folder layout with a README in every folder, and an AI-agnostic **agent harness** (skills, hook scripts, three agents) that works the same in Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, and any other tool that reads `AGENTS.md` and `.agents/skills`.

## Getting started

1. **Windows only, before cloning:** enable Developer Mode (Settings → System → For developers) and run `git config --global core.symlinks true`. The `.claude/` folder is tracked as symlinks; without this, Git checks them out as text files and Claude Code sees no skills.
2. Clone, then install the Git hooks once: `sh scripts/githooks-init.sh`
3. Run the `project-init` skill (`/project-init` in Claude Code). It asks, through the tool's own question prompt, what the project is, where the requirements live, the stack and the Jira project, and writes the answers to `MEMORY.md`, this README and `docs/agents/issue-tracker.md`. It hands you the scaffold commands for the stack; running them is up to you.
4. Skills are vendored in `.agents/skills`, so there is nothing to install. To add one: `npx skills add <owner/repo> -s <skill> -a claude-code codex -y`, then `sh scripts/skills-relink.sh`, then commit.
5. Open the repo in your AI tool, authorise the Atlassian MCP server when the tool asks (Jira is the issue tracker, see [MCP servers](#files-per-ai-tool)), and check the section for your tool under [Files per AI tool](#files-per-ai-tool).

## Layout

| Path | What it is |
| --- | --- |
| `src/`, `tests/`, `scripts/`, `tools/`, `docs/` | Product code, tests, repo automation, dev utilities, documents. Each has a README describing what belongs there. |
| `AGENTS.md` | The one file every agent reads: layout, where skills are, domain-language pointers. Kept short on purpose. |
| `CLAUDE.md` | One line, `@AGENTS.md`, because Claude Code reads `CLAUDE.md` rather than `AGENTS.md`. |
| `MEMORY.md` | The project facts (name, purpose, requirements location, stack, Jira project), one per line. Written by the `project-init` skill; absent until it runs. |
| `skills-lock.json` | Written by `npx skills`: source, path and hash of every installed skill. The single record of what is installed; `scripts/skills-install.sh` restores from it. |
| `.agents/skills/<name>/` | The canonical, vendored copy of each skill (`SKILL.md` plus its reference files). |
| `.agents/hooks/` | Harness-neutral hook scripts (see [Hooks](#hooks)). |
| `.agents/agents/` | Agent definitions (see [Agents](#agents)). |
| `.claude/` | Claude Code wiring: `skills/*` and `agents` are symlinks into `.agents/`, `settings.json` wires the hooks. |
| `.githooks/`, `scripts/githooks-init.sh` | Git hooks, run through `core.hooksPath` after `githooks-init.sh` is run once per clone. `post-merge` pipes the changed files into `scripts/on-manifest-change.sh`, which restores what `scripts/stacks.tsv` says (skills, npm, pnpm, yarn, NuGet, uv); `--dry-run` shows what it would do. |
| `docs/agents/` | Per-repo configuration the skills read: issue tracker, triage labels, domain-doc rules. |
| `CODING_STANDARDS.md` | Rules the `code-review` skill applies to a diff. A stub until the stack lands; anything a tool enforces stays out of it. |
| `.editorconfig`, `.gitattributes`, `.gitignore`, `stylecop.json` | Encoding, indentation, line endings, ignored output and analyzer settings. Stack-specific entries are kept when they are inert on other stacks, so no stack is forced. |
| `workflows/` | Workflow specs written by `loop-me`. |
| `.scratch/` | Committed working files: feature specs, ticket drafts, prototypes not yet on a branch. |
| `.mcp.json`, `opencode.json` | MCP server registrations (Atlassian, for Jira) for Claude Code and OpenCode. |

## Skills

Skills follow the Agent Skills format: a folder with a `SKILL.md` whose frontmatter carries a `name` and a `description`, plus optional reference files. They are managed with the [`skills` CLI](https://skills.sh); `skills-lock.json` records what is installed and `.agents/skills` holds the files. Commit both, plus the `.claude/skills` links.

```bash
npx skills add mattpocock/skills -s wait-what -a claude-code codex -y   # add a skill
npx skills remove wait-what -y                                       # remove one
npx skills update                                                  # newer versions of everything
sh scripts/skills-relink.sh                                        # after any of the above, on Windows
```

- The relink step matters on Windows because the CLI recreates the Claude Code links as absolute junctions, which Git cannot store; on Linux and macOS it is a no-op.
- `sh scripts/skills-install.sh` restores `.agents/skills` from the lock file. A normal clone never needs it; the post-merge Git hook runs it when the lock changes.
- Do not edit a vendored skill in place; the next update overwrites it. Fork it under another name outside `.agents/skills`, or change it upstream.
- Two kinds of skill: **model-invoked** ones carry a description the agent matches on its own; **user-invoked** ones (`disable-model-invocation: true`) only fire when you type `/name`.

The table below is generated from the lock file, each skill's frontmatter and the agents' route tables by `node scripts/skills.js write`; `node scripts/skills.js check`, which the edit hook runs when any of those change, fails when the table is stale or a skill is routed by no agent.

<!-- skills:start -->
<!-- generated by: node scripts/skills.js write -->
| Skill | Invoked | Routed by | Source |
| --- | --- | --- | --- |
| `agent-browser` | by description | assistant, business-analyst, engineer | vercel-labs/agent-browser |
| `bdd-scenarios` | by description | business-analyst | thebushidocollective/han |
| `brd` | by description | business-analyst | local |
| `code-review` | by description | engineer | mattpocock/skills |
| `codebase-design` | by description | business-analyst, engineer | mattpocock/skills |
| `create-implementation-plan` | by description | engineer | github/awesome-copilot |
| `design-doc` | by description | engineer | diskd-ai/design-doc |
| `docs-check` | by description | business-analyst, engineer | local |
| `domain-modeling` | by description | business-analyst, engineer | mattpocock/skills |
| `feature-forge` | by description | business-analyst | jeffallan/claude-skills |
| `find-skills` | by description | engineer | vercel-labs/skills |
| `frontend-design` | by description | engineer | anthropics/skills |
| `grill-with-docs` | `/grill-with-docs` | business-analyst | mattpocock/skills |
| `grilling` | by description | business-analyst, engineer | mattpocock/skills |
| `handoff` | `/handoff` | engineer | mattpocock/skills |
| `implement` | `/implement` | engineer | mattpocock/skills |
| `improve-codebase-architecture` | `/improve-codebase-architecture` | engineer | mattpocock/skills |
| `loop-me` | `/loop-me` | assistant, business-analyst, engineer | mattpocock/skills |
| `prd` | by description | business-analyst | github/awesome-copilot |
| `project-init` | `/project-init` | engineer | local |
| `prototype` | by description | engineer | mattpocock/skills |
| `retro` | `/retro` | engineer | mattpocock/skills |
| `setup-matt-pocock-skills` | `/setup-matt-pocock-skills` | engineer | mattpocock/skills |
| `setup-pre-commit` | by description | engineer | mattpocock/skills |
| `tailwind-design-system` | by description | engineer | wshobson/agents |
| `tdd` | by description | engineer | mattpocock/skills |
| `teach` | `/teach` | assistant, business-analyst, engineer | mattpocock/skills |
| `to-questionnaire` | `/to-questionnaire` | business-analyst | mattpocock/skills |
| `to-tickets` | `/to-tickets` | business-analyst, engineer | mattpocock/skills |
| `triage` | `/triage` | engineer | mattpocock/skills |
| `vercel-react-best-practices` | by description | engineer | vercel-labs/agent-skills |
| `vercel-react-view-transitions` | by description | engineer | vercel-labs/agent-skills |
| `wait-what` | `/wait-what` | engineer | mattpocock/skills |
| `writing-for-agents` | by description | assistant, business-analyst, engineer | mattpocock/skills |
<!-- skills:end -->

## Hooks

Three POSIX `sh` scripts in `.agents/hooks/`. Each reads the harness's JSON payload from stdin, prints a message, and uses the exit code every harness understands the same way: `0` = fine, `2` = block or send the message back to the agent.

| Script | Event | Does |
| --- | --- | --- |
| `session-start.sh` | session start | Prints a brief into the agent's context: branch, whether Git hooks are installed, skills recorded in `skills-lock.json` but missing from disk, whether `CONTEXT.md`, `docs/adr/` and the issue-tracker config exist. |
| `guard-command.sh` | before a shell command | Blocks force pushes, `git reset --hard`, `git clean -f`, `git branch -D`, and recursive deletes of `/`, `~`, `.git` or `*`. The agent is told to ask you instead. |
| `check-edit.sh` | after a file write/edit | Syntax-checks `*.sh` and `*.js`, validates `*.json`, runs `scripts/docs-check.sh` for Markdown under `docs/` and for `AGENTS.md`, runs `scripts/skills.js check` when the lock, an agent, a local skill or README changed, runs the hook suite when a file under `.agents/hooks/` changed, and refuses in-place edits of vendored skills. |

The scripts are harness-neutral; the wiring is one small config file per tool, listed under [Files per AI tool](#files-per-ai-tool). Only the Claude Code wiring ships in the repo, because it is the one that has been run.

`lib.sh` (with `payload.js` for the JSON) is the one place that knows how a harness hands over its payload: it finds the repo root (`CLAUDE_PROJECT_DIR`, `CURSOR_PROJECT_DIR` or `GEMINI_PROJECT_DIR`, else the checkout the hooks live in) and turns the edited path into a repo-relative one whether the harness sent `tool_input.file_path` (Claude Code, Gemini CLI), a top-level `file_path` (Cursor) or a `toolArgs` string with a `path` (Copilot). Paths outside the repo and unreadable payloads are skipped with a note on stderr, never blocked. `sh .agents/hooks/test.sh` pipes every fixture in `.agents/hooks/tests/` through its script (a hook, or `scripts/on-manifest-change.sh --dry-run`) and compares exit code and output; `check-edit.sh` runs that suite itself whenever a hook, the Git hook or the stack table changes.

## Agents

Agent definitions live in `.agents/agents/*.md`: YAML frontmatter with `name` and `description`, then the system prompt. The format is the one Claude Code, Cursor and Gemini CLI read directly; Codex and Copilot need a copy in their own shape (see their sections). Each agent routes a request to the skills it owns and runs them to their own definition of done.

| Agent | For |
| --- | --- |
| `engineer` | Engineering tasks bigger than a one-line edit, and the ADR → SPEC → TDD → IPLAN → Code half of the documentation chain |
| `business-analyst` | Requirements, process design, interface contracts, agent-ready briefs, the BRD → PRD → EARS → BDD half of the documentation chain |
| `assistant` | Non-technical colleagues |

Which skills each agent routes to is the \"Routed by\" column of the [Skills](#skills) table; the route tables themselves are in the agent files.

## Files per AI tool

What each tool reads, what is already in the repo, and what you must create for that tool. Paths are relative to the repo root. Only the Claude Code wiring has been run; the other rows come from each tool's own documentation.

### Claude Code

| Need | File | In repo |
| --- | --- | --- |
| Instructions | `CLAUDE.md` containing `@AGENTS.md` (Claude Code does not read `AGENTS.md` itself) | yes |
| Skills | `.claude/skills/<name>` → symlink to `../../.agents/skills/<name>` | yes |
| Hooks | `.claude/settings.json` → `hooks.SessionStart`, `PreToolUse` (matcher `Bash`), `PostToolUse` (matcher `Edit\|Write\|MultiEdit`), each `{"type":"command","command":"sh \"$CLAUDE_PROJECT_DIR/.agents/hooks/<script>\""}` | yes |
| Agents | `.claude/agents` → symlink to `../.agents/agents`; frontmatter `name`, `description` (+ optional `tools`, `model`, `skills`) | yes |
| Per-developer overrides | `.claude/settings.local.json` (git-ignored) | no |

Invoke an agent with "use the engineer agent to …", or a skill with `/tdd`, `/grilling`, and so on. On Windows the symlinks need Developer Mode and `core.symlinks=true` (see Getting started); if you cannot use symlinks, run `npx skills add … --copy` and copy `.agents/agents/*.md` into `.claude/agents/`.

### Other tools

| Tool | Instructions | Skills | Hooks | Agents | MCP (Atlassian) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI Codex | `AGENTS.md`, read natively | `.agents/skills/`, read natively | create `.codex/hooks.json`, same shape as `.claude/settings.json` | create `.codex/agents/<name>.toml`, one per agent | create `.codex/config.toml` with `[mcp_servers.atlassian]`, then `codex mcp login atlassian` | Edits arrive as `apply_patch` commands with the paths inside the patch; `check-edit.sh` skips them until `payload.js` learns that shape. [Docs](https://developers.openai.com/codex/hooks) |
| Cursor | `AGENTS.md`, read natively | `.agents/skills/`, read natively | create `.cursor/hooks.json` (`sessionStart`, `beforeShellExecution`, `afterFileEdit`) | create `.cursor/agents/<name>.md`: copy or symlink | create `.cursor/mcp.json` (`mcpServers`, no `type`) | Exit 2 blocks; `file_path` and `command` are top-level payload fields, which `payload.js` reads. [Docs](https://cursor.com/docs/agent/hooks) |
| GitHub Copilot | `AGENTS.md`, read natively | `.agents/skills/`, read natively | create `.github/hooks/*.json` (`sessionStart`, `preToolUse`, `postToolUse`) | create `.github/agents/<name>.agent.md`: copy with the suffix | create `.vscode/mcp.json` (`servers`) | `toolArgs` is a JSON string inside the payload, which `payload.js` parses; any non-zero exit denies. [Docs](https://docs.github.com/en/copilot/reference/hooks-reference) |
| Gemini CLI | `GEMINI.md` by default; point it at `AGENTS.md` through `.gemini/settings.json` | `.agents/skills/`, read natively | create `.gemini/settings.json` with `hooks` (`SessionStart`, `BeforeTool`, `AfterTool`) | create `.gemini/agents/<name>.md`: copy or symlink | create `.gemini/settings.json` with `mcpServers` (`httpUrl`) | Same payload shape as Claude Code; timeouts in milliseconds and a `name` per hook. [Docs](https://geminicli.com/docs/hooks/) |
| OpenCode | `AGENTS.md`, read natively | `.agents/skills/`, read natively | a JS plugin under `.opencode/plugins/` that shells out to the three scripts; there are no command hooks | none | `opencode.json`, in repo | [Docs](https://opencode.ai/docs/plugins/) |
| Anything else | `AGENTS.md` | read each `SKILL.md` description and load what matches, as `AGENTS.md` says | wire the three scripts to the tool's events: payload on stdin, exit 2 blocks | an agent file pasted as the system prompt | its own file | |

The Atlassian server URL and the Jira conventions the skills follow are in `docs/agents/issue-tracker.md`; the question tool per harness is in `docs/agents/questions.md`.

## Documentation chain

The chain BRD → PRD → EARS → BDD → ADR → SPEC → TDD → IPLAN → Code, its folders and the skill for each stage are the table in `AGENTS.md` ("Documentation"); `docs/README.md` says what each document must contain. Documents are `docs/<stage>/NNNN-<slug>.md` and cite what they derive from; `scripts/docs-check.sh` reads the stages from that table and verifies the IDs and citations, the edit hook runs it after every change under `docs/` or to `AGENTS.md`, and the `docs-check` skill repairs its findings.

## What each skill expects from the repo

Most skills need nothing beyond `AGENTS.md` and their own folder. The files under `docs/agents/` are configuration the template ships; everything else in the table below is created by the skill itself when first needed.

### Shared setup: `docs/agents/`

`code-review`, `to-tickets` and `triage` read the issue-tracker configuration and refuse to run without it. The template ships it configured for **Jira through the Atlassian MCP server**:

- `docs/agents/issue-tracker.md`: which MCP tools create, read, label, link and close issues. **Replace `TODO-PROJECT-KEY` with your Jira project key** before first use.
- `docs/agents/triage-labels.md`: maps the five triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) to plain Jira labels of the same names.
- `docs/agents/domain.md`: tells skills to read `CONTEXT.md` and `docs/adr/` before exploring, and to stay silent when they are absent.
- `docs/agents/questions.md`: the question tool each harness offers (Claude Code, OpenCode, Copilot and so on) and the plain-text fallback, so interviews and confirmations always go through the tool. `AGENTS.md` ("Working here") makes this a rule for every skill.
- The `## Agent skills` section in `AGENTS.md` points at the three files.

To switch trackers (GitHub via `gh`, GitLab via `glab`, or local Markdown under `.scratch/`), run `/setup-matt-pocock-skills` in your agent; the skill is vendored and rewrites the three files and the `AGENTS.md` block from its templates.

### Per skill

| Skill | Reads | Writes |
| --- | --- | --- |
| `code-review` | `docs/agents/issue-tracker.md`; `CODING_STANDARDS.md`; the spec, from an issue in the commit messages, a path you pass, or a file under `docs/`, `specs/` or `.scratch/` matching the branch | nothing |
| `to-tickets` | `docs/agents/issue-tracker.md` | drafts under `.scratch/<feature-slug>/`, then Jira issues in dependency order |
| `triage` | `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, `.out-of-scope/` | `.out-of-scope/<concept>.md` per rejected request; Jira labels and comments |
| `domain-modeling`, also through `grill-with-docs`, `improve-codebase-architecture` and `triage` | `CONTEXT.md`, `docs/adr/` | `CONTEXT.md`, `docs/adr/NNNN-<slug>.md`; `CONTEXT-MAP.md` only in a multi-context repo |
| `brd`, `prd`, `feature-forge`, `bdd-scenarios`, `design-doc`, `create-implementation-plan` | the document one stage upstream; `CONTEXT.md` when present | `docs/<stage>/NNNN-<slug>.md` per the `AGENTS.md` table (`.scratch/<feature>/` for the plan), whatever path the skill's own instructions name |
| `docs-check` | the `AGENTS.md` table, `docs/` | repairs in place |
| `project-init` | answers from the harness's question tool | `MEMORY.md`, the Project section of this README, the key and site in `docs/agents/issue-tracker.md` |
| `teach` | the working directory as a workspace | `MISSION.md`, `RESOURCES.md`, `NOTES.md`, `reference/`, `lessons/`, `learning-records/`, `assets/` |
| `loop-me` | `NOTES.md`, shared with `teach` | `workflows/<name>.md`, `NOTES.md` |
| `implement`, `tdd`, `prototype` | a spec or tickets; the stack's test runner, type checker and task runner | code under `src/` and `tests/`; prototypes on a throwaway branch |
| `retro` | the session logs of the agent that ran | proposed edits to `AGENTS.md`, `CODING_STANDARDS.md`, the docs and the skills |
| `agent-browser` | the `agent-browser` CLI (`npx agent-browser` fetches it) | nothing in the repo |

`handoff` and `improve-codebase-architecture` write to the OS temp directory. `setup-matt-pocock-skills` rewrites `docs/agents/` and the `Agent skills` block of `AGENTS.md` when the tracker changes. Every other skill reads nothing but `AGENTS.md`.
