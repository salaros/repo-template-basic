# Tools

Standalone utilities that support development but are not part of the
application and are not general repository automation.

## What belongs here

- **Developer utilities** — small programs for generating test data,
  inspecting outputs, converting formats, or debugging.
- **Vendored tools** — third-party executables or tool configurations pinned
  to a version the project depends on (linters, formatters, code generators),
  when they can't be pulled in through the package manager.
- **Local tool manifests** — e.g. `dotnet-tools.json`, `.tool-versions`.

## Difference from `scripts/`

`scripts/` holds short, task-oriented automation for the repository itself
(setup, build, release). `tools/` holds self-contained utilities that have
their own logic, dependencies, or source code and could be run independently
of the repo workflow. If it's a one-file shell script that does one repo
chore, it goes in `scripts/`; if it's a program with its own README or build
step, it goes here.

## Conventions

- Each tool lives in its own subfolder with a short README explaining what it
  does and how to run it.
- Tools must not be imported by application code in `src/`.
- Pin versions of any vendored binaries and note the source they came from.
