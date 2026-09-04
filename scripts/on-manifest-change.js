#!/usr/bin/env node
// scripts/on-manifest-change.js
// Reads changed file paths on stdin (one per line, repo-relative) and runs the restore command of
// every row in scripts/stacks.tsv whose trigger patterns match one of them, provided the row's
// "needs" file exists at the repo root. The post-merge Git hook pipes `git diff-tree` output into
// it; the harness suite pipes fixtures with --dry-run.
// Usage: node scripts/on-manifest-change.js [--dry-run] < changed-paths
//   --dry-run  print "would run: <command>" per matching row instead of running it
const fs = require("fs");
const path = require("path");
const lib = require("./lib");

process.chdir(path.resolve(__dirname, ".."));
const dry = process.argv.includes("--dry-run");
const changed = lib.stdin().split(/\r?\n/).filter(Boolean);
if (!changed.length) { if (dry) console.log("nothing to restore"); process.exit(0); }

// A pattern matches a changed path by full path or basename; * matches anything within a name.
const toRe = pat => new RegExp(`^${pat.split("*").map(s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")}$`);
const matches = triggers => triggers.split(" ").some(pat => {
    const re = toRe(pat);
    return changed.some(p => re.test(p) || re.test(path.posix.basename(p)));
});

let status = 0, ran = false;
for (const [stack, triggers, needs, restore] of lib.readTsv("scripts/stacks.tsv")) {
    if (restore === "-" || !matches(triggers)) continue;
    if (needs !== "-" && !fs.existsSync(needs)) continue;
    ran = true;
    if (dry) { console.log(`would run: ${restore} (${stack})`); continue; }
    console.log(`${stack} manifests changed: running ${restore}`);
    const r = lib.shell(restore, { stdio: "inherit" });
    if (r.status !== 0) { console.error(`${restore} failed`); status = 1; }
}
if (!ran && dry) console.log("nothing to restore");
process.exit(status);
