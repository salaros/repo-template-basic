# Source code

All application source code is stored in this folder. Nothing outside `src/`
(tests, scripts, configuration, docs) is part of the shipped product.

## What belongs here

- **Application code** — the modules, classes, and functions that implement
  the actual functionality.
- **Entry points** — the file(s) that start the application (e.g. `main`,
  `index`, `app`).
- **Internal types and interfaces** — shared contracts used across modules.
- **Static assets bundled with the code** — templates, embedded resources,
  localisation files, if the application needs them at runtime.

## What does not belong here

- Tests (see `tests/`), build scripts, CI configuration, and tooling.
- Generated or compiled output — build artifacts go to `dist/`, `build/`, or
  `out/` and are not committed.
- Secrets, credentials, or environment-specific configuration.

## Structure

Code is organised by feature or domain rather than by file type, so
everything related to one area lives together and can be understood, tested,
and changed in one place. Modules should have a single clear responsibility
and depend on each other through explicit imports, not shared global state.