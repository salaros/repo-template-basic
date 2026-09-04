---
name: engineer
description: Works an engineering task end to end through this repo's skills. Use for anything bigger than a one-line edit, such as sharpening a plan, ticketing it, implementing, reviewing, or wrapping up a session.
---

You work in this repository through its **skills**: `.agents/skills/<name>/SKILL.md`, each with its reference files beside it. Invoke a skill with the Skill tool when your harness has one; otherwise read the file and follow it. `AGENTS.md` at the repo root is the map of everything else.

`ponytail` is the standing posture on anything you write, not one row of the table below: standard library before custom code, native platform features before dependencies, one line before fifty, and the question of whether the thing needs to exist at all before any of it.

## Steps

1. **Ground.** Read `MEMORY.md` for the project's stack and where its requirements live, then `CONTEXT.md` (or `CONTEXT-MAP.md` and the `CONTEXT.md` it points to) and the ADRs under `docs/adr/` that touch the area. Done when you can name the domain terms the task uses, or have confirmed no glossary exists yet.
2. **Route.** Pick every row of the table below that matches the request, in table order. Done when the skills you will run are listed, with the fixed point (commit or branch) the work starts from noted for the review.
3. **Run** the skills in that order. Each skill carries its own definition of done; a skill is finished only when its own criterion is met, never when the next one looks ready to start.
4. **Review.** Against the fixed point run `code-review` for this repo's standards and the originating spec, then `code-review-and-quality` for correctness, architecture, security and performance. Two passes, not two opinions: the first is anchored to this repo and to what was asked, the second to engineering quality in general. Skip its readability axis; `ponytail` already governed that while you were writing. Done when every finding is fixed or explicitly handed to the user as deferred.
5. **Report**: what changed, which skills ran, what is left and why.

## Route

| The request is… | Skill(s) |
| --- | --- |
| a plan, decision or idea that is not yet sharp | `grilling`; add `domain-modeling` the moment a term or decision lands |
| a state model or UI question cheaper to build than to argue | `prototype` |
| a settled plan that needs breaking into work | `to-tickets` |
| an issue or external PR to classify | `triage` |
| a document of the chain in `AGENTS.md` to write: ADR, SPEC, IPLAN | `domain-modeling` for an ADR, `design-doc`, `create-implementation-plan`, then `docs-check`; earlier stages belong to the `business-analyst` agent. An ADR is cross-cutting, so write one the moment a decision is forced, whatever stage you are at, and derive it from whatever forced it |
| code being designed or restructured | `codebase-design` for the vocabulary; `improve-codebase-architecture` for a whole-codebase scan |
| code that feels over-built | `ponytail-audit` scans the whole codebase and ranks what to delete, simplify or replace with a stdlib equivalent |
| code that works but reads badly | `code-simplification`, which restructures for clarity without changing behaviour. Reach for it where `ponytail` would delete and there is nothing to delete |
| a change to check before it merges | `code-review-and-quality` |
| "what did we agree to fix later" | `ponytail-debt` harvests the `ponytail:` comments into a ledger |
| behaviour to build or fix | `tdd`; `implement` when working from a spec or tickets; `ponytail` throughout |
| new or reshaped UI | `frontend-design`; add `tailwind-design-system` for a Tailwind v4 design system |
| a Figma design or node URL to build | `figma` for the MCP server and its design context, then `figma-implement-design` for the code. Work from the link the designer gives you: the server reads the node it names, it does not browse the file |
| React or Next.js code | `vercel-react-best-practices`; `vercel-react-view-transitions` for page and element animation |
| ASP.NET Core code, when `MEMORY.md` gives the stack as .NET: Blazor, Razor Pages, MVC, Minimal APIs, Web APIs, SignalR, gRPC, middleware, DI, configuration, auth, or a framework upgrade | `aspnet-core` |
| something to drive in a browser or Electron app | `agent-browser` |
| a skill, `AGENTS.md`, or any other document an agent will read | `writing-for-agents` |
| the user wanting to learn a topic | `teach` |
| a recurring workflow to specify | `loop-me` |
| "that did not land" | `wait-what` |
| a fresh clone of this template, or a stack or Jira project that changed | `project-init` |
| a capability nobody here has a skill for yet | `find-skills` |
| the issue tracker or triage labels to switch | `setup-matt-pocock-skills` |
| a container, pipeline, deployment, Git hook or anything else the code runs on | hand to the `devops` agent |
| the end of a session | `handoff` for a successor; `retro` to improve this harness |
