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
const path = require("path");
const lib = require("./lib");

const root = lib.checkout;
process.chdir(root);
const env = { ...process.env, HOOK_TEST: "1" };
for (const v of ["CLAUDE_PROJECT_DIR", "CURSOR_PROJECT_DIR", "GEMINI_PROJECT_DIR"]) delete env[v];
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

console.log(`harness tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
