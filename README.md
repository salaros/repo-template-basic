# Basic repo template

A starting point that does not assume a language or framework: `.gitignore`, `.gitattributes`, Git hooks, a folder layout with a README in every folder, and an AI-agnostic **agent harness** (skills, hook scripts, three agents) that works the same in Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI, and any other tool that reads `AGENTS.md` and `.agents/skills`.

## Getting started

1. **Windows only, before cloning:** enable Developer Mode (Settings → System → For developers) and run `git config --global core.symlinks true`. The `.claude/` folder is tracked as symlinks; without this, Git checks them out as text files and Claude Code sees no skills.
2. Clone, then install the Git hooks once: `sh scripts/githooks-init.sh`
3. Skills are vendored in `.agents/skills`, so there is nothing to install. To add one: `npx skills add <owner/repo> -s <skill> -a claude-code -y`, then `sh scripts/skills-relink.sh`, then commit.
4. Open the repo in your AI tool, authorise the Atlassian MCP server when the tool asks (Jira is the issue tracker, see [MCP servers](#mcp-servers)), and check the section for your tool under [Files per AI tool](#files-per-ai-tool).

## Layout

| Path | What it is |
| --- | --- |
| `src/`, `tests/`, `scripts/`, `tools/`, `docs/` | Product code, tests, repo automation, dev utilities, documents. Each has a README describing what belongs there. |
| `AGENTS.md` | The one file every agent reads: layout, where skills are, domain-language pointers. Kept short on purpose. |
| `CLAUDE.md` | One line, `@AGENTS.md`, because Claude Code reads `CLAUDE.md` rather than `AGENTS.md`. |
| `skills-lock.json` | Written by `npx skills`: source, path and hash of every installed skill. The single record of what is installed; `scripts/skills-install.sh` restores from it. |
| `.agents/skills/<name>/` | The canonical, vendored copy of each skill (`SKILL.md` plus its reference files). |
| `.agents/hooks/` | Harness-neutral hook scripts (see [Hooks](#hooks)). |
| `.agents/agents/` | Agent definitions (see [Agents](#agents)). |
| `.claude/` | Claude Code wiring: `skills/*` and `agents` are symlinks into `.agents/`, `settings.json` wires the hooks. |
| `.githooks/`, `scripts/githooks-init.sh` | Git hooks (post-merge reinstalls dependencies and skills when their manifests change). |
| `docs/agents/` | Per-repo configuration the skills read: issue tracker, triage labels, domain-doc rules. |
| `CODING_STANDARDS.md` | Rules the `code-review` skill applies to a diff. A stub until the stack lands. |
| `workflows/` | Workflow specs written by `loop-me`. |
| `.scratch/` | Committed working files: feature specs, ticket drafts, prototypes not yet on a branch. |
| `.mcp.json`, `opencode.json` | MCP server registrations (Atlassian, for Jira) for Claude Code and OpenCode. |

## Skills

Skills follow the Agent Skills format: a folder with a `SKILL.md` whose frontmatter carries a `name` and a `description`, plus optional reference files. They are managed with the [`skills` CLI](https://skills.sh); `skills-lock.json` records what is installed and `.agents/skills` holds the files. Commit both, plus the `.claude/skills` links.

```bash
npx skills add mattpocock/skills -s to-spec -a claude-code -y   # add a skill
npx skills remove to-spec -y                                       # remove one
npx skills update                                                  # newer versions of everything
sh scripts/skills-relink.sh                                        # after any of the above, on Windows
```

- The relink step matters on Windows because the CLI recreates the Claude Code links as absolute junctions, which Git cannot store; on Linux and macOS it is a no-op.
- `sh scripts/skills-install.sh` restores `.agents/skills` from the lock file. A normal clone never needs it; the post-merge Git hook runs it when the lock changes.
- Do not edit a vendored skill in place; the next update overwrites it. Fork it under another name outside `.agents/skills`, or change it upstream.
- Two kinds of skill: **model-invoked** ones carry a description the agent matches on its own (`tdd`, `grilling`, `code-review`); **user-invoked** ones (`disable-model-invocation: true`) only fire when you type `/name` (`grill-me`, `implement`, `teach`, `to-tickets`, `triage`, `handoff`, `retro`). `npx skills list` shows what is installed.

## Hooks

Three POSIX `sh` scripts in `.agents/hooks/`. Each reads the harness's JSON payload from stdin, prints a message, and uses the exit code every harness understands the same way: `0` = fine, `2` = block or send the message back to the agent.

| Script | Event | Does |
| --- | --- | --- |
| `session-start.sh` | session start | Prints a brief into the agent's context: branch, whether Git hooks are installed, skills recorded in `skills-lock.json` but missing from disk, whether `CONTEXT.md`, `docs/adr/` and the issue-tracker config exist. |
| `guard-command.sh` | before a shell command | Blocks force pushes, `git reset --hard`, `git clean -f`, `git branch -D`, and recursive deletes of `/`, `~`, `.git` or `*`. The agent is told to ask you instead. |
| `check-edit.sh` | after a file write/edit | Syntax-checks `*.sh`, validates `*.json`, and refuses in-place edits of vendored skills. |

The scripts are harness-neutral; the wiring is one small config file per tool, listed under [Files per AI tool](#files-per-ai-tool). Only the Claude Code wiring ships in the repo, because it is the one that has been run.

## Agents

Agent definitions live in `.agents/agents/*.md`: YAML frontmatter with `name` and `description`, then the system prompt. The format is the one Claude Code, Cursor and Gemini CLI read directly; Codex and Copilot need a copy in their own shape (see their sections). Each agent routes a request to the skills it owns and runs them to their own definition of done.

| Agent | For | Skills it routes to |
| --- | --- | --- |
| `engineer` | Engineering tasks bigger than a one-line edit | all of them: `grilling`, `domain-modeling`, `prototype`, `to-tickets`, `triage`, `codebase-design`, `improve-codebase-architecture`, `tdd`, `implement`, `frontend-design`, `tailwind-design-system`, `vercel-react-*`, `agent-browser`, `code-review`, `writing-for-agents`, `teach`, `loop-me`, `wait-what`, `handoff`, `retro` |
| `business-analyst` | Requirements, process design, interface contracts, agent-ready briefs | `grilling`, `grill-with-docs` (grilling + `domain-modeling`), `codebase-design`, `to-tickets`, `loop-me`, `teach`, `writing-for-agents`, `agent-browser` |
| `assistant` | Non-technical colleagues | `teach`, `loop-me`, `writing-for-agents`, `agent-browser` |

Three skill names have been renamed upstream since they were first published: `to-issues` is now `to-tickets`, `design-an-interface` is now `codebase-design`, and `write-a-skill` is now `writing-for-agents`. The agents use the current names.

## MCP servers

The skills reach Jira through the Atlassian Rovo MCP server at `https://mcp.atlassian.com/v2/mcp` (streamable HTTP, OAuth sign-in on first use). Every tool registers MCP servers in its own file and none of them reads another tool's, so the registration is repeated per tool:

| Tool | File | In repo |
| --- | --- | --- |
| Claude Code | `.mcp.json` → `{"mcpServers": {"atlassian": {"type": "http", "url": …}}}` | yes |
| OpenCode | `opencode.json` → `{"mcp": {"atlassian": {"type": "remote", "url": …, "enabled": true}}}` | yes |
| Cursor | `.cursor/mcp.json`, same `mcpServers` shape as `.mcp.json` without `type` | create (a symlink to `.mcp.json` should work, unverified) |
| Codex | `.codex/config.toml` → `[mcp_servers.atlassian]` / `url = "…"`, then `codex mcp login atlassian` | create |
| Copilot in VS Code | `.vscode/mcp.json` → `{"servers": {"atlassian": {"type": "http", "url": …}}}` | create |
| Gemini CLI | `.gemini/settings.json` → `{"mcpServers": {"atlassian": {"httpUrl": …}}}` | create |

## Files per AI tool

What each tool reads, what is already in the repo, and what you must create for that tool. Paths are relative to the repo root.

### Claude Code

| Need | File | In repo |
| --- | --- | --- |
| Instructions | `CLAUDE.md` containing `@AGENTS.md` (Claude Code does not read `AGENTS.md` itself) | yes |
| Skills | `.claude/skills/<name>` → symlink to `../../.agents/skills/<name>` | yes |
| Hooks | `.claude/settings.json` → `hooks.SessionStart`, `PreToolUse` (matcher `Bash`), `PostToolUse` (matcher `Edit\|Write\|MultiEdit`), each `{"type":"command","command":"sh \"$CLAUDE_PROJECT_DIR/.agents/hooks/<script>\""}` | yes |
| Agents | `.claude/agents` → symlink to `../.agents/agents`; frontmatter `name`, `description` (+ optional `tools`, `model`, `skills`) | yes |
| Per-developer overrides | `.claude/settings.local.json` (git-ignored) | no |

Invoke an agent with "use the engineer agent to …", or a skill with `/tdd`, `/grill-me`, and so on. On Windows the symlinks need Developer Mode and `core.symlinks=true` (see Getting started); if you cannot use symlinks, run `npx skills add … --copy` and copy `.agents/agents/*.md` into `.claude/agents/`.

### OpenAI Codex

| Need | File | In repo |
| --- | --- | --- |
| Instructions | `AGENTS.md` (read natively, from the Git root down to the working directory) | yes |
| Skills | `.agents/skills/` (read natively); the optional `agents/openai.yaml` inside a skill folder holds display name and invocation policy | yes |
| Hooks | `.codex/hooks.json` (same shape as Claude Code's) | create |
| Agents | `.codex/agents/engineer.toml` (one per agent) | create |

```json
{
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "sh .agents/hooks/session-start.sh", "timeout": 20 }] }],
    "PreToolUse":   [{ "hooks": [{ "type": "command", "command": "sh .agents/hooks/guard-command.sh", "timeout": 10 }] }],
    "PostToolUse":  [{ "hooks": [{ "type": "command", "command": "sh .agents/hooks/check-edit.sh",    "timeout": 30 }] }]
  }
}
```

```toml
# .codex/agents/engineer.toml
name = "engineer"
description = "Works an engineering task end to end through this repo's skills."
developer_instructions = """
(paste the body of .agents/agents/engineer.md, below the frontmatter)
"""
```

Codex tool names in `matcher` were not verified, so the snippet matches every tool; the guard only acts on payloads that contain a shell command.

### Cursor

| Need | File | In repo |
| --- | --- | --- |
| Instructions | `AGENTS.md` (read natively); `.cursor/rules/*.mdc` for path-scoped rules | yes |
| Skills | `.agents/skills/` (read natively, alongside `.cursor/skills/`) | yes |
| Hooks | `.cursor/hooks.json` | create |
| Agents | `.cursor/agents/<name>.md`, same frontmatter as `.agents/agents/*.md`: copy or symlink the files | create |

```json
{
  "version": 1,
  "hooks": {
    "sessionStart":         [{ "command": "sh .agents/hooks/session-start.sh", "timeout": 20 }],
    "beforeShellExecution": [{ "command": "sh .agents/hooks/guard-command.sh", "timeout": 10 }],
    "afterFileEdit":        [{ "command": "sh .agents/hooks/check-edit.sh",    "timeout": 30 }]
  }
}
```

Cursor decides on a shell command from JSON the hook prints, not from its exit code, so the guard's block may only surface as a message there. Not verified.

### GitHub Copilot

| Need | File | In repo |
| --- | --- | --- |
| Instructions | `AGENTS.md` (read natively); `.github/copilot-instructions.md` for Copilot-only notes | yes |
| Skills | `.agents/skills/` (read natively, alongside `.github/skills/` and `.claude/skills/`) | yes |
| Hooks | `.github/hooks/harness.json` on the default branch | create |
| Agents | `.github/agents/<name>.agent.md`: copy of `.agents/agents/<name>.md` with the `.agent.md` suffix | create |

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{ "type": "command", "bash": "sh .agents/hooks/session-start.sh", "timeoutSec": 20 }],
    "preToolUse":   [{ "type": "command", "bash": "sh .agents/hooks/guard-command.sh", "timeoutSec": 10 }],
    "postToolUse":  [{ "type": "command", "bash": "sh .agents/hooks/check-edit.sh",    "timeoutSec": 30 }]
  }
}
```

The cloud coding agent uses the camelCase events and `bash` key above; Copilot in VS Code reads the same folder but with PascalCase events (`SessionStart`, `PreToolUse`, `PostToolUse`) and a `command` key. Keep one file per surface if you use both.

### Gemini CLI

| Need | File | In repo |
| --- | --- | --- |
| Instructions | `GEMINI.md` by default; point it at `AGENTS.md` through `.gemini/settings.json` (below) | create |
| Skills | `.agents/skills/` (read natively, alongside `.gemini/skills/`) | yes |
| Hooks | `.gemini/settings.json` → `hooks` (timeouts in milliseconds, `name` required) | create |
| Agents | `.gemini/agents/<name>.md`, same frontmatter as `.agents/agents/*.md`: copy or symlink | create |

```json
{
  "context": { "fileName": ["AGENTS.md", "GEMINI.md"] },
  "hooks": {
    "SessionStart": [{ "hooks": [{ "name": "brief", "type": "command", "command": "sh $GEMINI_PROJECT_DIR/.agents/hooks/session-start.sh", "timeout": 20000 }] }],
    "BeforeTool":   [{ "matcher": "run_shell_command", "hooks": [{ "name": "guard", "type": "command", "command": "sh $GEMINI_PROJECT_DIR/.agents/hooks/guard-command.sh", "timeout": 10000 }] }],
    "AfterTool":    [{ "matcher": "write_file|replace", "hooks": [{ "name": "check", "type": "command", "command": "sh $GEMINI_PROJECT_DIR/.agents/hooks/check-edit.sh", "timeout": 30000 }] }]
  }
}
```

### Other tools

Amp, Cline, OpenCode, Warp, Zed, Antigravity and Kimi read `AGENTS.md` and `.agents/skills` natively, so they need nothing. For a tool with its own skills folder (`.windsurf/skills`, `.kiro/skills`, `.roo/skills`, …), run `npx skills add <owner/repo> -s '*' -a <tool> -y` once; the CLI links the folder for you, and `sh scripts/skills-relink.sh` makes the links committable. For hooks and agents, check the tool's docs for its equivalents of the three events and the frontmatter above.

## What each skill expects from the repo

Most skills need nothing beyond their own folder. The ones below read or write project files; none of those files exist in the template, and most are created lazily by the skill itself. Files under `docs/agents/` are the exception: they are configuration that must exist first.

### Shared setup: `docs/agents/`

`code-review`, `to-tickets` and `triage` read the issue-tracker configuration and refuse to run without it. The template ships it configured for **Jira through the Atlassian MCP server**:

- `docs/agents/issue-tracker.md`: which MCP tools create, read, label, link and close issues. **Replace `TODO-PROJECT-KEY` with your Jira project key** before first use.
- `docs/agents/triage-labels.md`: maps the five triage roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) to plain Jira labels of the same names.
- `docs/agents/domain.md`: tells skills to read `CONTEXT.md` and `docs/adr/` before exploring, and to stay silent when they are absent.
- The `## Agent skills` section in `AGENTS.md` points at the three files.

To switch trackers (GitHub via `gh`, GitLab via `glab`, or local Markdown under `.scratch/`), run `/setup-matt-pocock-skills` in your agent; the skill is vendored and rewrites the three files and the `AGENTS.md` block from its templates.

### `domain-modeling` (also used by `grill-with-docs`, `improve-codebase-architecture`, `triage`)

- `CONTEXT.md` at the root: the glossary, one opinionated definition per term with the synonyms to avoid. Created when the first term is resolved.
- `docs/adr/NNNN-slug.md`: one short decision record each, numbered from `0001`. Created when the first decision qualifies.
- `CONTEXT-MAP.md` at the root only for multi-context repos; it points at one `CONTEXT.md` per context, typically `src/<context>/CONTEXT.md` with `src/<context>/docs/adr/`.

`tdd`, `wait-what`, `code-review` and `to-tickets` read these files when present and continue silently when not.

### `code-review`

- `docs/agents/issue-tracker.md` (see shared setup) to fetch the originating issue.
- Coding standards to review against: `CODING_STANDARDS.md` at the root (a stub to fill in as code lands). Without rules there, only the built-in code-smell baseline applies.
- The spec, found in this order: an issue referenced from the commit messages, a path you pass, or a file under `docs/`, `specs/` or `.scratch/` matching the branch.

### `to-tickets`

- `docs/agents/issue-tracker.md` (see shared setup).
- Tickets are published to Jira in dependency order; drafts and the spec live under `.scratch/<feature-slug>/` (committed, see `.scratch/README.md`).

### `triage`

- `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` (see shared setup).
- `.out-of-scope/<concept>.md`: one file per rejected feature request, written by the skill when an enhancement is closed as `wontfix` and read to spot repeats.

### `implement`

- A spec or ticket set to work from (the `to-tickets` output or an issue).
- A test runner and type checker it can call; it runs single test files while working and the full suite at the end, then hands over to `code-review`.

### `prototype`

- The project's task runner, so a UI prototype starts from one command; logic prototypes are a single HTML file.
- A throwaway branch to commit the prototype to; only the validated decision lands on the main branch.

### `improve-codebase-architecture`

- `CONTEXT.md` and `docs/adr/` if they exist, and a commit history to find hot spots. Its HTML report goes to the OS temp directory, not the repo.

### `teach`

Treats the working directory as a teaching workspace and creates, as needed: `MISSION.md`, `RESOURCES.md`, `NOTES.md`, `reference/*.html`, `lessons/NNNN-slug.html`, `learning-records/NNNN-slug.md`, and `assets/` for shared stylesheets and widgets. Run it in a dedicated folder rather than the repo root.

### `loop-me`

Writes `workflows/<name>.md`, one spec per recurring workflow (the folder exists, see `workflows/README.md`), and `NOTES.md` with the user's tools, channels and terminology. `teach` uses the same `NOTES.md` name, so run `teach` in its own folder.

### `retro`

Reads the session logs of the agent that ran, then proposes edits to `AGENTS.md`/`CLAUDE.md`, `CODING_STANDARDS.md`, the docs and the skills. It expects `writing-for-agents` to be installed (it is).

### `handoff`

Writes the handoff document to the OS temp directory, never into the repo. Nothing to create.

### `agent-browser`

Needs the `agent-browser` CLI on the machine (`npx agent-browser` fetches it). The skill is hidden from `/` completion and is reached by the agents or by the model on browser tasks.

### Skills that need nothing

`codebase-design`, `frontend-design`, `grilling`, `grill-me`, `grill-with-docs`, `tailwind-design-system`, `tdd`, `vercel-react-best-practices`, `vercel-react-view-transitions`, `wait-what`, `writing-for-agents`. `setup-matt-pocock-skills` is the one that writes `docs/agents/`.
