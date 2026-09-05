# Issue tracker: Jira (Atlassian MCP)

A tracker is optional. When `MEMORY.md` records `Jira: none` this file does not apply: work items live in `docs/` and under `.scratch/`, and a skill that needs a tracker says so instead of guessing at one. The rest of this file describes the tracker a project has when it has one.

Issues and specs for this repo live in Jira. Agents reach Jira through the **Atlassian Rovo MCP server** (`https://mcp.atlassian.com/v2/mcp`), registered in `.mcp.json` (Claude Code, Cursor) and `opencode.json` (OpenCode) at the repo root; the server must be authorised once per tool (OAuth in the tool's MCP settings). Tool names below are the v2 names. If the project uses Jira and no Jira tools are available in your session, tell the user to authorise the Atlassian connector rather than falling back to another tracker.

**Project key:** `TODO-PROJECT-KEY` _(replace with the Jira project key, e.g. `CC`; every operation below is scoped to it)._

## Conventions

- **Create an issue**: `createJiraIssue` with the project key, an issue type of `Bug` or `Task` (`Story` if the project uses it), the summary, and the Markdown body from the skill's issue template. Add labels in the same call.
- **Read an issue**: `getJiraIssue` for fields, description and labels; comments are included in the issue payload.
- **List issues**: `searchJiraIssuesUsingJql`, e.g. `project = TODO-PROJECT-KEY AND labels = needs-triage ORDER BY created ASC`. Unlabeled issues: `project = TODO-PROJECT-KEY AND labels IS EMPTY AND statusCategory != Done`.
- **Comment**: `addOrEditJiraIssueComment`. Every comment written during triage starts with the disclaimer line the `triage` skill prescribes.
- **Apply / remove labels**: `editJiraIssue` on the `labels` field. Labels are the triage vocabulary (see `triage-labels.md`); do not change workflow status to express triage state.
- **Close**: `listJiraIssueTransitions`, then `transitionJiraIssue` to the project's Done or Won't Do transition, after posting the closing comment.
- **Blocking edges** between tickets: `createJiraIssueLink` with the `Blocks` link type. Where linking is unavailable, write `Blocked by: KEY-1, KEY-2` at the top of the description.
- **Find the project** if the key is in doubt: `listJiraProjects`.
- **Resolve a bare reference** like `#42` or `42` as `TODO-PROJECT-KEY-42`.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if external PRs should run through triage; `triage` reads this flag. PRs live in the Git host, not Jira, so the PR commands come from that host's CLI.)_

## When a skill says "publish to the issue tracker"

Create one Jira issue per ticket in dependency order (blockers first) so each ticket's `Blocked by` can name real keys, then link them with `Blocks`. Apply the `ready-for-agent` label unless told otherwise. Drafts written before publishing live under `.scratch/<feature-slug>/issues/`.

## When a skill says "fetch the relevant ticket"

`getJiraIssue` on the key the user gave. Read the description and all comments before acting.
