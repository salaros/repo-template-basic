---
name: brd
description: Write or revise a Business Requirements Document (BRD), the first document of the chain in AGENTS.md. Use when a project or feature starts from a business need, when someone asks why we are building something or what success looks like for the business, or before a PRD exists.
---

# Business Requirements Document

The BRD answers **why**: the business justification, the strategic goal it serves, and how the business will know it worked. It is the seed of the documentation chain; the PRD is derived from it, so anything vague here is paid for at every later stage. It contains no solution: no features, screens, or technology.

Read `CONTEXT.md` first if it exists and use its terms. Read any earlier documents under `docs/brd/` so numbering and vocabulary stay consistent.

## Steps

1. **Interview.** Use the `grilling` skill on the business need: who is asking, what pain or opportunity, what changes for the business when it is solved, how that change will be measured, what is explicitly out of scope, who has to agree. Write the questions and the answers to `.scratch/<slug>/interview.md` as you go, since that file is the source this BRD derives from. Done when every section below can be filled with a specific sentence, not a placeholder.
2. **Draft** the document at `docs/brd/NNNN-<slug>.md`, numbered after the highest existing file, using the template below. Done when every success factor is measurable and every business requirement is traceable to one of them.
3. **Confirm** with the user, section by section, and fix what they change. Done when they say the document is agreed; then record that in `Status`.
4. **Point `MEMORY.md` at it.** Its `Requirements` line named where requirements lived before this document existed; replace that with this BRD's ID, so the chain, not the source, is the entry point from here on. Done when `node scripts/docs-check.js` is clean.
5. **Hand off**: tell the user the PRD can now be derived with the `prd` skill from this file.

## Template

```md
# BRD-NNNN: <Title>

**Status:** draft | agreed | superseded by BRD-NNNN
**Owner:** <business owner>
**Derived from:** <the source this came from: .scratch/<slug>/interview.md, a URL, or jira:KEY-123>

## Overview
<One paragraph: the business situation and the opportunity or problem.>

## Objectives
- <Strategic goal this serves, in the business's own words>

## Success factors
- SF-1: <Measurable outcome, with a number and a date>

## Scope
**In:** <business capabilities covered>
**Out:** <explicitly excluded, so the PRD does not drift into it>

## Stakeholders
| Who | Role | Needs |
| --- | --- | --- |

## Business requirements
- BR-1 (SF-1): <What the business needs, stated as an outcome, not a feature>

## Assumptions and constraints
- <Budget, timeline, regulation, dependencies on other work>
```

## Quality bar

- `**Derived from:**` names a real source, never "none": a repo-relative path that exists, a URL, or a Jira key. A BRD that came out of a conversation cites the interview file, so the reasoning behind it survives the session.
- Every requirement says what the business needs, never how the product does it. "Customers can settle an invoice without calling support" belongs here; "add a Pay Now button" belongs in the PRD.
- Every success factor has a number, a baseline where one exists, and a date.
- The Out-of-scope list is as long as the In list; silence there is where later stages go wrong.
