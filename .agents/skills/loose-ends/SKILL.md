---
name: loose-ends
description: Record a loose end in TODO.md at the repo root: a question nobody has answered, an assumption taken on trust and not verified, or work knowingly left undone. Use the moment one arises mid-task, before handing work back, and when reviewing what is still open. Needs no issue tracker.
---

# Loose ends

Work leaves things behind. A question you could not answer, a decision you took on an assumption, an edge case you chose not to handle: each one is real, none of them belongs in the code you just wrote, and all of them are gone the moment the session ends. `TODO.md` at the repo root is where they live instead. It needs no issue tracker, so a project that plans in `docs/` keeps its loose ends exactly as well as one that runs Jira.

The file holds what has nowhere else to live. That boundary is the whole skill: everything with a better home goes to its better home.

## The entry

One line, whatever the kind:

```md
- [ ] <tag>: <text> (<source>)
```

| Tag | For | Resolved by |
| --- | --- | --- |
| `question:` | nobody has answered it, and the work went on without the answer | someone answering it |
| `assumption:` | taken on trust, not verified, and the work rests on it | verifying it, or finding it false |
| `deferred:` | knowingly left undone, with no line of code to mark | doing it, or deciding it will never be done |

The **source** says where the entry came from, in the vocabulary `AGENTS.md` gives the documentation chain: a URL, a repo-relative path that exists, or `jira:KEY-123`. Add a line number for code: `scripts/lib.js:34`.

```md
# Loose ends

- [ ] question: should the gate run on push as well as commit (.githooks/pre-push)
- [ ] assumption: every clone has run githooks-init (scripts/githooks-init.js:1)
- [ ] deferred: the relink path has no test (scripts/skills.js:88)
```

Anything that is not a checkbox line is prose. Give the file a heading and a sentence of explanation if it helps; only the entries are checked.

## Steps

1. **Decide it belongs here.** Two questions, in order.

   Does it have a home in the source? Then it goes there, as a `// TODO:` comment on the line it concerns, and `duck-debt` finds it at the end of the session. `TODO.md` is for what has no line to comment on: a question about the design, an assumption about the environment, work not yet started.

   Does the answer change what gets built right now? Then ask, through the harness's question tool, and wait for the answer. An entry is not a way to avoid asking. Record only what does not block: an assumption you took safely, a question that can wait, work you left on purpose.

   Done when the item either has a comment in the code, an answer from the user, or a place in the list below.

2. **Write the entry**, in the format above, the moment the item arises rather than at the end. Create `TODO.md` if it does not exist yet; the template ships without one, because an empty ledger says less than no ledger. Pick the tag by what would resolve it, not by how it feels. Done when the line names the thing specifically enough that someone who was not there can act on it.

3. **Delete what you resolved.** An entry leaves the file in the commit that resolves it, the way a stale citation is fixed rather than annotated. Never tick the box: `- [x]` is an answered question left lying around, and the `pre-commit` hook rejects it. The file's length is a signal, and that only holds while it shows nothing but open items. Done when every entry still in the file is still open.

4. **Hand the deferred work over** when someone runs `to-tickets` and the project has a tracker. Read the open `deferred:` entries alongside the plan being broken down, publish the ones that are real work, and delete each entry the moment its ticket exists. Two records of one item is one record too many. Done when nothing in `TODO.md` duplicates a ticket.

## Report

What you added, what you deleted and why, and how many items are still open.

## Gotchas

- The blocking test is about the work, not your confidence. Something you are sure about still blocks if being wrong would mean rewriting what you are about to write.
- A tag is chosen by its resolution. "The cache might be stale" is an `assumption:` if the work relies on it being fresh, a `deferred:` if the fix is simply not written yet, and a `question:` if only the user can say which.
- `duck-debt` and `ponytail-debt` read code comments and nothing else. They will never see this file, and it must never restate what they already find.
- The source must resolve. `(during the review)` is not a source and the hook rejects it; the file it was a review of is.
- `node scripts/check-todo.js TODO.md` runs the same check the hook runs, before you stage anything.
