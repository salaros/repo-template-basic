# Document Overview

| Document Type | Core Question | Main Author | Primary Audience | Downstream Dependency |
| --- | --- | --- | --- | --- |
| **MRD** (Market Requirements Document) | **Who** has this problem and **what** is the true market need? | Product Marketing Manager / Product Manager | Executives, Product, Sales & Marketing | Feeds into **BRD** |
| **BRD** (Business Requirements Document) | **Why** are we doing this? | Business Analyst / Product Owner | Executives, Stakeholders, Sponsors | Feeds into **PRD** |
| **PRD** (Product Requirements Document) | **What** are we building? | Product Manager | Engineering, Design, QA | Feeds into **SRS** / **ADR** |
| **SRS** (Software Requirements Specification) | **How** must the software technically work (system level)? | Systems Analyst / Software Architect | Engineers, QA, Architects | Feeds into **FRS** / **ADR** / Test Plans |
| **FRS** (Functional Requirements Specification) | **What** happens step-by-step during a user interaction? | Business Analyst / Systems Analyst | Developers, QA / Testers | Implementation Code, Test Cases |
| **ADR** (Architecture Decision Record) | **How** is it technically decided? | Software Architect / Tech Lead | Engineering Team, Future Maintainers | Implementation Code |

## BRD (Business Requirements Document)

The BRD is the highest-level strategic document. It captures the business justification, market opportunity, and high-level expectations before any solution is designed. [1]

- The Mighty Question: WHY are we doing this? (A.k.a., “How does this make us look good on the quarterly earnings call?”)
- The Goal: To explain the business justification and link the project to strategic goals.
- Key Contents: Project Overview, Success Factors, High–Level Scope, Stakeholders, Business Requirements.
- Think of it as: The deck you present when the CFO enters the meeting and asks where the ROI is.


## PRD (Product Requirements Document)

The PRD translates the strategic intent of the BRD into concrete product features, user experiences, and functional workflows. It acts as the central contract for product delivery teams. [1, 2]

- The Mighty Question: WHAT will the product be?
- The Goal: To describe the specific product solution, its features, and how it behaves.
- Easy Rule: BRD is the business reason. PRD is the product solution.
- Key Contents: Purpose, Objectives, Features, User Stories, Functional Requirements, - Non–Functional Requirements, Scope, and Constraints.
- Think of it as: The guiding document or at least the one you reference loudly in meetings when Engineering questions your decision from three weeks ago.



## ADR (Architecture Decision Record)

The ADR is a lightweight, immutable log entry that captures a single significant architectural decision made during the technical realization of the PRD. [1]

- Title: Short identifier (e.g., ADR-004: Use PostgreSQL for User Metadata Storage).
- Status: Current state (e.g., Proposed, Accepted, Deprecated).
- Context: The technical forces, constraints, and PRD requirements driving the choice.
- Decision: The definitive technical choice being made.
- Consequences: The resulting trade-offs, positive impacts, and negative side effects (technical debt or maintenance overhead).

## MRD: The Customer’s Cry for Help

The Market Requirements Document (MRD) tells the story of the pain.

- The Mighty Question: WHO has this problem and WHAT is the true market need?
- The Goal: To align the team on the customer, the pain point, and the market value of solving it.
- Key Contents: Personas, Problem Scenarios, Customer Journeys, Workflows, and the final statement of the true market need.
- Note: Many agile teams kill this doc, preferring to embed market context directly into user stories. If you skip it, you are running the risk of building features nobody actually needs.

## SRS: The Developer’s Truth Serum

The Software Requirements Specification (SRS) is the highly detailed, technical companion to the PRD.

- The Mighty Question: HOW must the software technically work?
- The Goal: To become the single source of truth for Engineers, QA, and Architects. It makes sure every technical assumption is spelled out, eliminating the classic phrase: “It should just work.”
- Key Contents: Detailed Functional Requirements, Interface Requirements, and robust Non–Functional Requirements (performance, security, scalability).

## FRS: The Real–World Behavior Breakdown

The Functional Requirements Specification (FRS) is the detailed handshake between developers and testers.

- The Mighty Question: WHAT happens step–by–step during a user interaction?
- The Goal: To explain the specific functions, the step–by–step behavior, and the system’s reaction to user input. It focuses purely on function.
- Difference: SRS covers the system level (including performance, architecture). FRS focuses on functionality only.
- Key Contents: Specific Use Cases, detailed Input/Output tables, and flow diagrams.