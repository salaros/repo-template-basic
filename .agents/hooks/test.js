#!/usr/bin/env node
// .agents/hooks/test.js
// Runs the harness suite. Every line of tests/cases.tsv is six tab-separated columns:
//   <script and args> <fixture> <expected exit> <setup> <expected output> <note>
// The script is relative to the repo root and run with node; the fixture is piped to it as stdin
// with __ROOT__ replaced by this checkout; setup is "-" or "plant <path> <first line>", a file
// that exists only while that case runs; expected output is "-" or a substring that the combined
// stdout and stderr must contain. Prints one FAIL line per mismatch and exits 1 if any.
// Usage: node .agents/hooks/test.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const lib = require("./lib");
const docsCheck = require("../../scripts/docs-check");

const root = lib.checkout;
process.chdir(root);
const env = { ...process.env, HOOK_TEST: "1" };
for (const v of lib.ROOT_ENV_VARS) delete env[v];
const rootForFixtures = root.split(path.sep).join("/");

let planted = null;
const plant = (file, ...firstLine) => {
    planted = file;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, firstLine.join(" ") + "\n");
};
const cleanup = () => {
    if (!planted) return;
    try { fs.unlinkSync(planted); } catch { }
    try { fs.rmdirSync(path.dirname(planted)); } catch { }   // only when the case created it
    planted = null;
};
process.on("exit", cleanup);

let pass = 0, fail = 0;
const failed = (title, out) => { fail++; console.log(`FAIL ${title}`); if (out) console.log(out.replace(/^/gm, "    ")); };

for (const [script, fixture, expect, setup, want, note] of lib.readTsv(".agents/hooks/tests/cases.tsv")) {
    if (setup.startsWith("plant ")) plant(...setup.split(" ").slice(1));
    const input = fs.readFileSync(path.join(".agents/hooks/tests", fixture), "utf8").split("__ROOT__").join(rootForFixtures);
    const { status, output } = lib.node(script.split(" "), { input, env });
    cleanup();
    const ok = String(status) === expect && (want === "-" || output.includes(want));
    if (ok) pass++;
    else failed(`${script} < ${fixture}: exit ${status}, expected ${expect}, output must contain "${want}" (${note})`, output);
}

// The roster must be consistent too: every skill routed, README table current.
const roster = lib.node(["scripts/skills.js", "check"]);
if (roster.status === 0) pass++; else failed("node scripts/skills.js check", roster.output);

// docs-check's citation logic, exercised directly against a throwaway doc tree (real stage
// folder names, so it uses the real AGENTS.md chain) rather than through a fixture: a duplicate
// document number, a citation to an item that does not exist in its target, and a citation that
// jumps forward in the chain. A unique OS-temp directory, not a fixed path under the repo, so two
// runs (a manual one and one the edit hook triggers) can never collide on the same files.
{
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-docs-check-"));
    const write = (rel, ...lines) => {
        const file = path.join(tmp, rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, lines.join("\n") + "\n");
    };
    write("brd/9001-alpha.md", "# BRD-9001: Alpha");
    write("brd/9001-beta.md", "# BRD-9001: Beta");
    write("brd/9002-source.md", "# BRD-9002: Source", "", "- BR-1: Something real");
    write("prd/9002-citer.md", "# PRD-9002: Citer", "", "**Derived from:** BRD-9002", "", "Refines BRD-9002/BR-2, which does not exist.");
    write("brd/9003-support.md", "# BRD-9003: Support");
    write("ears/9003-late.md", "# EARS-9003: Late");
    write("prd/9003-early.md", "# PRD-9003: Early", "", "**Derived from:** BRD-9003", "", "See EARS-9003 for details.");
    const { problems } = docsCheck.check(tmp, "AGENTS.md");
    fs.rmSync(tmp, { recursive: true, force: true });
    const expectProblem = (title, needle) => {
        if (problems.some(p => p.includes(needle))) pass++;
        else failed(`docs-check: ${title}`, `expected a problem containing "${needle}"\ngot:\n${problems.join("\n") || "(none)"}`);
    };
    expectProblem("duplicate document number", "already used by");
    expectProblem("citation to a missing item", "has no item BR-2");
    expectProblem("citation later in the chain", "later in the chain");
}

// root() must actually follow a harness's project-dir variable, not just fall back to this
// checkout — the one branch no TSV fixture exercises, since they all run with these variables
// cleared. Points CLAUDE_PROJECT_DIR at an unrelated directory with its own MEMORY.md and checks
// that session-start.js reports on THAT directory.
{
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "harness-root-test-"));
    fs.writeFileSync(path.join(other, "MEMORY.md"), "# Project memory\n");
    const r = lib.node([".agents/hooks/session-start.js"], { env: { ...env, CLAUDE_PROJECT_DIR: other } });
    fs.rmSync(other, { recursive: true, force: true });
    if (r.status === 0 && r.output.includes("facts in MEMORY.md") && !r.output.includes("not initialised")) pass++;
    else failed("session-start.js follows CLAUDE_PROJECT_DIR", `expected output to reflect ${other}'s MEMORY.md\ngot:\n${r.output}`);
}

console.log(`harness tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
