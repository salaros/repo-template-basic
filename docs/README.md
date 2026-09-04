# Documents

Everything written about this project before and beside its code lives here, one folder per stage of the chain in `AGENTS.md` ("Documentation"). That table is the only list of stages, folders and skills; this file says what each document is for and what it must contain. `node scripts/docs-check.js` verifies that the folders, IDs and citations agree with the table.

Every document is `docs/<stage>/NNNN-<slug>.md`, its ID is `<STAGE>-NNNN`, its first heading is `# <STAGE>-NNNN: <title>`, and from the PRD on it carries a `**Derived from:**` line citing the document(s) upstream. Items a later stage will refine start their line with a short ID (`BR-2`, `FR-3`, `AC-1`, `### D-1`), and later documents cite them as `DOC-ID/ITEM`.

## BRD, Business Requirements Document

**Why** the business wants it, and how it will know it worked. No solution: no features, screens or technology.

Contains: overview of the situation, objectives in the business's words, measurable success factors (`SF-n`, each with a number and a date), scope in and out, stakeholders, business requirements (`BR-n`, each tied to a success factor), assumptions and constraints. The `brd` skill writes it.

## PRD, Product Requirements Document

**What** the product does, for whom. Turns the business requirements into a product: users, journeys, features, functional and non-functional requirements, scope and constraints.

Contains: purpose and objectives citing `BRD-NNNN/BR-n`, user stories, functional requirements (`FR-n`), non-functional requirements (`NFR-n`), out of scope, open questions. The `prd` skill writes it.

## EARS, requirements as "shall" statements

**Each requirement as one testable sentence** in the EARS form: ubiquitous, event-driven ("When … the system shall …"), state-driven ("While …"), unwanted behaviour ("If … then the system shall …"), optional feature. One statement per line with an ID (`REQ-n`), each citing the `PRD-NNNN/FR-n` it refines, with acceptance criteria (`AC-n`). The `feature-forge` skill writes it.

## BDD, behaviour scenarios

**Behaviour as Given / When / Then.** One feature file per document, scenarios grouped by rule, each scenario citing the `EARS-NNNN/REQ-n` it exercises; edge cases and failure paths are scenarios too. These become the acceptance tests. The `bdd-scenarios` skill writes it.

## ADR, Architecture Decision Record

**A decision that is hard to reverse**, recorded once, immutable after acceptance. One decision per file.

Contains: title, status (proposed, accepted, deprecated, superseded by ADR-NNNN), context including the requirements that force the choice, the decision, alternatives considered, consequences. The `domain-modeling` skill writes it; `CONTEXT.md` holds the vocabulary the decisions use.

## SPEC, technical design

**How** the system satisfies the requirements: the design that engineering builds from.

Contains: goals and non-goals citing the EARS and BDD documents, the architecture and its components, data model, interfaces between modules and with the outside, decisions taken (citing the ADRs), risks, test strategy, and the sections a later implementation plan will refine (`### D-n`). The `design-doc` skill writes it.

## After the documents

Tests (`tests/`), the implementation plan (`.scratch/`, published to Jira by `to-tickets`) and code (`src/`) are the remaining stages; they are not documents and the validator does not read them.
