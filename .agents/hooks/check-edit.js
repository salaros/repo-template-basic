#!/usr/bin/env node
// .agents/hooks/check-edit.js
// Runs after the harness writes or edits a file. Gets the edited path from lib.js (repo-relative,
// whatever the harness sent) and applies the first matching rule below that objects: a refusal
// when a vendored skill was edited in place, node --check for *.js, JSON validity for *.json, the
// documentation chain for Markdown under docs/ and for AGENTS.md (whose table defines the chain),
// and the hook test suite when the harness itself changed. Each rule catches something broken; none
// of them asks a project to keep bookkeeping current.
// Exit 2 = send the message on stderr back to the agent. Exit 0 = silent.
// Wire it to the post-tool-use event of the edit/write tools (README, "Files per AI tool").
const fs = require("fs");
const lib = require("./lib");
const docsCheck = require("../../scripts/docs-check");

const rules = [
    {   // Vendored skills (recorded in skills-lock.json) must not be edited in place; local skills may be.
        when: /^(?:\.agents|\.claude)\/skills\/([^/]+)\/./,
        check: (file, m) => lib.node(["scripts/skills.js", "vendored", m[1]]).status === 0
            && `${file} belongs to the vendored skill '${m[1]}': npx skills update will overwrite it. Change it upstream, or copy it to a new local skill under .agents/skills/<other-name>/.`,
    },
    {
        when: /\.(?:js|mjs|cjs)$/,
        check: file => { const r = lib.node(["--check", file]); return r.status !== 0 && `JavaScript syntax error in ${file}: ${r.output}`; },
    },
    {
        when: /\.json$/,
        check: file => { try { JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return `invalid JSON in ${file}: ${e.message}`; } },
    },
    {   // The chain: any Markdown under docs/, and the AGENTS.md table the validator reads the stages from.
        when: /^(?:AGENTS\.md|docs\/.*\.md)$/,
        check: () => { const r = docsCheck.check(); return r.problems.length > 0 && `documentation chain check failed (see AGENTS.md, Documentation; fix with the docs-check skill):\n${r.problems.join("\n")}`; },
    },
    {   // The harness itself changed: the suite must still pass (HOOK_TEST stops recursion).
        when: /^(?:\.agents\/hooks\/|\.githooks\/|scripts\/(?:on-manifest-change|docs-check|skills|check-staged-docs|format-changed|check-commit-msg|check-initialised)\.js$|scripts\/stacks\.tsv$)/,
        check: file => { if (process.env.HOOK_TEST) return false; const r = lib.node([".agents/hooks/test.js"]); return r.status !== 0 && `hook tests failed after editing ${file}:\n${r.output}`; },
    },
];

const root = lib.root();
process.chdir(root);
let status = 0;
for (const file of lib.filePaths(lib.payload(), root)) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    for (const rule of rules) {
        const m = file.match(rule.when);
        if (!m) continue;
        const msg = rule.check(file, m);
        if (msg) { process.stderr.write(msg + "\n"); status = 2; break; }
    }
}
process.exit(status);
