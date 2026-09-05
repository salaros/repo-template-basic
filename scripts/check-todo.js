#!/usr/bin/env node
// scripts/check-todo.js
// Keeps TODO.md greppable. The `loose-ends` skill records what has nowhere else to live -- a
// question nobody answered, an assumption taken on trust, work knowingly left -- one entry per
// line, and a ledger only pays for itself if every entry can be found by its tag.
// Only checkbox lines are entries; every other line is prose the file is free to carry, so a
// header explaining the format costs nothing and a hand-written note is never rejected.
// It never asks for entries to exist: an empty ledger, or no TODO.md at all, is the honest state
// of a repo with nothing outstanding.
// Called by .githooks/pre-commit, which pipes the staged blob in, so the check sees what the commit
// will record rather than what is on disk. Reads a path instead when given one.
// Usage:
//   git show :TODO.md | node scripts/check-todo.js
//   node scripts/check-todo.js TODO.md
const fs = require("fs");
const lib = require("./lib");

const TAGS = ["question", "assumption", "deferred"];
// `- [ ] tag: text (source)`. Anything not starting a checkbox is prose and not our business.
const BOX = /^\s*-\s*\[( |x|X)\]\s*(.*)$/;
const ENTRY = new RegExp(`^(${TAGS.join("|")}): (.+?) \\(([^()]+)\\)$`);
// A source says where the entry came from, in the vocabulary AGENTS.md already gives the chain:
// a URL, a repo-relative path that exists, or jira:KEY-123, plus path:line for pointing at code.
const URL = /^https?:\/\/\S+$/;
const JIRA = /^jira:[A-Z][A-Z0-9]+-\d+$/;

function badSource(src, root) {
    if (URL.test(src) || JIRA.test(src)) return null;
    const file = src.replace(/:\d+(?:-\d+)?$/, "");
    if (/^[^\s:]/.test(file) && fs.existsSync(`${root}/${file}`)) return null;
    return `"${src}" is not a source: a URL, a repo-relative path that exists (optionally path:line), or jira:KEY-123`;
}

const file = process.argv.slice(2).find(a => !a.startsWith("--"));
const text = file ? fs.readFileSync(file, "utf8") : lib.stdin();
const root = lib.chdirRoot();

if (!text.trim()) { console.log("TODO.md: nothing to check"); process.exit(0); }

const problems = [];
let entries = 0;
text.split(/\r?\n/).forEach((line, i) => {
    const box = line.match(BOX);
    if (!box) return;
    const at = `line ${i + 1}`;
    // Resolved means deleted, in the commit that resolves it, so the file's length stays a signal
    // of what is still open. A ticked box is an entry that was answered and left lying around.
    if (box[1] !== " ") {
        problems.push(`${at}: a ticked entry. Delete it in the commit that resolves it: ${line.trim()}`);
        return;
    }
    entries++;
    const m = box[2].match(ENTRY);
    if (!m) {
        problems.push(`${at}: not an entry. Write "- [ ] <tag>: <text> (<source>)", tag one of ${TAGS.join(", ")}:\n    ${line.trim()}`);
        return;
    }
    const bad = badSource(m[3], root);
    if (bad) problems.push(`${at}: ${bad}`);
});

if (!problems.length) { console.log(`TODO.md: ${entries} open item(s), all well formed`); process.exit(0); }
console.error(`\nTODO.md has ${problems.length} problem(s):\n`);
for (const p of problems) console.error(`  ${p}`);
console.error(`\nThe loose-ends skill has the format. To commit anyway: git commit --no-verify\n`);
process.exit(1);
