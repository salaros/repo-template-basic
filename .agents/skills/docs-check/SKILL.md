---
name: docs-check
description: Verify and repair the documentation chain under docs/. Use after writing or editing any BRD, PRD, EARS, BDD, ADR or SPEC document, when a citation such as PRD-0002/FR-3 looks wrong, or when asked whether the docs are traceable.
---

# Docs check

The chain in `AGENTS.md` ("Documentation") only pays off when every document can be walked back to the business need. `scripts/docs-check.js` verifies that mechanically: file names give IDs, first headings carry them, every document after the BRD says what it was derived from, and every citation resolves to an existing document or item earlier in the chain.

## Steps

1. Run it from the repo root:

   ```bash
   node scripts/docs-check.js
   ```

   Done when you have the full list of problems, one per line, or the line saying there are none.

2. **Repair** each problem in the document it names, never by deleting the citation:
   - a missing or wrong first heading: make it `# <ID>: <title>` where the ID comes from the file name (`docs/ears/0003-x.md` is `EARS-0003`);
   - a missing `**Derived from:**` line: add it under the heading, citing the upstream document IDs;
   - a citation to a document that does not exist: find the intended file and fix the number, or write the missing upstream document first;
   - a citation to a missing item: add the ID to the item's line in the upstream document (`- FR-3: …`) if the item exists without an ID, otherwise fix the reference;
   - a forward citation: the document is citing a later stage; move that content downstream or drop the reference.

   Done when the script prints "no problems".

3. Report what you changed, per file.
