#!/usr/bin/env node
// scripts/update-harness.js
// Installs this repository's harness into another one, and updates it there afterwards. The
// upstream keeps moving; a repo made from it fills the same tree with work of its own. This script
// is the line between the two, and scripts/harness-files.tsv is where that line is written down.
//
// Updating is a three-way merge, not a copy. harness-lock.json at the target root records the
// upstream commit the harness was last taken from, so an update has a base: the recorded commit's
// version of a file, the target's version, and the new one. A file nobody edited takes the new
// version outright. An edited one keeps its edits and gains the changes around them. Only a real
// collision is written with conflict markers, and every one of those is reported and exits 1, so a
// half-merged harness is never mistaken for a clean update.
//
// First run into a repo with no harness-lock.json is an install: there is no base, so every managed
// file is written, and nothing that already exists is touched.
//
// Usage:
//   node scripts/update-harness.js                     update this repo from the upstream it records
//   node scripts/update-harness.js --dry-run           say what would change, write nothing
//   node scripts/update-harness.js --ref v2            update from a tag or branch instead
//   node scripts/update-harness.js --target ../other   install into or update another checkout
//   node scripts/update-harness.js --from ../ai-harness use a checkout you already have, no clone
//   node scripts/update-harness.js --astro-docs        add tools/docs-site, the Astro renderer for the chain
//   node scripts/update-harness.js --no-check          install without proving it afterwards
//   node scripts/update-harness.js --quiet             the summary alone, no line per path
//   node scripts/update-harness.js --adopt             replace a harness that predates harness-lock.json
// Installing into a repo that has no harness yet, from anywhere:
//   git clone https://github.com/salaros/ai-harness .harness && \
//     node .harness/scripts/update-harness.js --from .harness --target . && rm -rf .harness
const fs = require("fs");
const os = require("os");
const path = require("path");
const lib = require("./lib");

const TEMPLATE = "https://github.com/salaros/ai-harness.git";
const LOCK = "harness-lock.json";
const MANIFEST = "scripts/harness-files.tsv";
const DEFAULT_REF = "master";

const argv = process.argv.slice(2);
const flag = name => argv.includes(name);
const value = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const dryRun = flag("--dry-run");
const adopt = flag("--adopt");

// ---------------------------------------------------------------- the target

// Where the harness is going. Run from inside a project, that is the project: this script sits in
// its scripts/ folder. Run through npx, the package is an extracted tarball with no .git of its own,
// so the answer is the directory the user is standing in. One rule covers both, and --target covers
// installing into a checkout from somewhere else entirely.
function targetRoot() {
    const given = value("--target", null);
    if (given) return path.resolve(given);
    const beside = path.resolve(__dirname, "..");
    return fs.existsSync(path.join(beside, ".git")) ? beside : process.cwd();
}

// ---------------------------------------------------------------- the upstream

// A clone deep enough to read the recorded commit: an update needs that commit's version of a file
// as the merge base, and --depth 1 would not have it. Removed again unless the caller supplied one.
function templateCheckout(ref) {
    // The manifest is what makes a checkout usable here, so both routes are held to it: a --from
    // that points somewhere else, and a --ref naming a branch or tag from before the table existed,
    // fail the same way. Without this the run reaches readTsv and dies in a stack trace naming a
    // temporary directory the reader has never heard of.
    const usable = dir => fs.existsSync(path.join(dir, MANIFEST));
    const given = value("--from", null);
    if (given) {
        const dir = path.resolve(given);
        if (!usable(dir)) fail(`${dir} does not look like the upstream harness: no ${MANIFEST}`);
        return { dir, temporary: false };
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-"));
    say(`cloning ${TEMPLATE} at ${ref}`);
    const r = lib.run("git", ["clone", "--quiet", "--branch", ref, TEMPLATE, dir]);
    if (r.status !== 0) fail(`could not clone the upstream at ${ref}\n${r.output}`);
    if (!usable(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        fail(`${TEMPLATE} at ${ref} carries no ${MANIFEST}, so there is nothing to install from; try another --ref`);
    }
    return { dir, temporary: true };
}

// The installer's own name and version, read from the package it ships inside rather than written
// down here, so a release cannot forget to update it. It answers what the upstream commit cannot:
// which released tool wrote this tree. Both routes land on the right file, because the script always
// sits in the scripts/ folder of either the npm package or a checkout of the upstream. Omitted
// rather than recorded as null when it cannot be read, so the receipt never claims a version it
// does not know.
function installer() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8"));
        return pkg.name && pkg.version ? { installer: `${pkg.name}@${pkg.version}` } : {};
    } catch { return {}; }
}

const at = (dir, args) => lib.run("git", ["-C", dir, ...args]);

// The upstream's version of a path at a commit, or null when the file did not exist there. Also how
// a missing base is detected: a rewritten history no longer holds the recorded commit.
function blob(dir, commit, file) {
    const r = at(dir, ["show", `${commit}:${file}`]);
    return r.status === 0 ? r.output : null;
}

// ---------------------------------------------------------------- the manifest

function policies(templateDir) {
    return lib.readTsv(path.join(templateDir, MANIFEST)).map(([p, policy]) => ({ path: p, policy }));
}

// First match wins, so the table's order is its precedence. A row ending in / covers everything under it.
// `optional:<flag>` is seeded only when the run asked for it, and is otherwise not installed at all:
// the docs site is the case, useful to some projects and dead weight in the rest.
function policyFor(rows, file) {
    const row = rows.find(r => r.path.endsWith("/") ? file.startsWith(r.path) : file === r.path);
    if (!row) return "merge";               // anything the upstream ships and nobody classified is harness
    if (!row.policy.startsWith("optional:")) return row.policy;
    return flag(`--${row.policy.slice("optional:".length)}`) ? "seed" : "template";
}

// Every path the upstream tracks, with the mode Git recorded. Mode 120000 is a symlink, and the
// harness has two kinds: .claude/agents pointing at .agents/agents, and one per skill under
// .claude/skills. Written as ordinary files they become text files holding a path, which is how a
// harness ends up looking installed while the agent sees no skills and no agents at all.
function templateFiles(dir) {
    const r = at(dir, ["ls-files", "-s"]);
    if (r.status !== 0) fail(`could not list the upstream's files\n${r.output}`);
    return r.output.split(/\r?\n/).filter(Boolean).map(line => {
        const [meta, file] = line.split("\t");
        return { file, link: meta.startsWith("120000"), exec: meta.startsWith("100755") };
    });
}

// Git runs a hook only if it is executable, and says nothing when it is not: an installed harness
// whose hooks are mode 644 looks installed and gates nothing. The upstream records them 100755, so
// that mode has to travel, and only Git can carry it. `chmod` alone is not enough -- on Windows
// core.fileMode is false and the call does nothing, so the file would be staged 100644 later and the
// hooks would run for whoever installed them and silently never run for anyone else. `git add
// --chmod=+x` writes the mode into the index whether or not the file was tracked, which is why the
// install stages these few files rather than leaving them for the project's own `git add`.
function carryMode(target, file) {
    try { fs.chmodSync(path.join(target, file), 0o755); } catch { /* the filesystem does not do modes */ }
    const r = lib.run("git", ["-C", target, "add", "--chmod=+x", "--", file]);
    if (r.status !== 0) say(`could not mark ${file} executable: ${r.output}`);
}

// A symlink recorded in Git is a blob holding its target. Windows needs Developer Mode and
// core.symlinks=true for this to work at all, so a refusal is reported rather than thrown: the
// harness still functions with the links missing, it is just invisible to the harnesses that read
// them, and README says how to turn them on.
function link(target, file, to) {
    const full = path.join(target, file);
    if (dryRun) return "written";
    fs.mkdirSync(path.dirname(full), { recursive: true });
    let existing = null;
    try { existing = fs.lstatSync(full); } catch { /* absent */ }
    if (existing) {
        // Something of the project's is in the way -- or, in a repo whose harness predates the lock
        // file, the link itself checked out as a text file holding a path, which is the failure that
        // leaves an agent seeing no skills at all. --adopt is the only thing that replaces it.
        if (!existing.isSymbolicLink()) { if (!adopt) return "kept"; fs.unlinkSync(full); }
        else if (fs.readlinkSync(full).split(path.sep).join("/") === to) return null;
        else fs.unlinkSync(full);
    }
    try {
        fs.symlinkSync(to.split("/").join(path.sep), full, "dir");
        return existing ? "merged" : "written";
    } catch (e) {
        say(`could not create the symlink ${file} -> ${to}: ${e.code || e.message}`);
        return "kept";
    }
}

// ---------------------------------------------------------------- skeletons

// Three files the upstream does not ship, because there they would be lies: MEMORY.md
// describes a project this repo is not, and CONTEXT.md and TODO.md are written by the skills that
// own them, when there is something real to put in them. A repo that just took the harness has
// neither the files nor any sign the harness expects them, so an empty one is laid down: it names
// the file, says which skill fills it, and is valid to every check that reads it. Written only when
// absent, and never touched again.
const SKELETONS = {
    "MEMORY.md": [
        "# Project memory",
        "",
        "The facts no other file derives. Read this first. The `project-init` skill writes it, and the",
        "`pre-commit` and `pre-push` hooks refuse to let work leave a clone while any value is still a",
        "`<placeholder>`.",
        "",
        "- **Name:** <name>",
        "- **Purpose:** <purpose>",
        "- **Requirements:** <requirements>",
        "- **Unit type:** <unit type>",
        "- **Language:** <language>",
        "- **Runtime / package manager:** <runtime>",
        "",
    ],
    "CONTEXT.md": [
        "# Context",
        "",
        "The project's glossary: one entry per term the code and the documents both use, in the words",
        "the business uses. The `domain-modeling` skill writes an entry the moment a term is settled,",
        "and the decisions those terms come out of live in `docs/adr/`.",
        "",
    ],
    "TODO.md": [
        "# TODO",
        "",
        "Loose ends, in the [todo-md](https://github.com/todo-md/todo-md) format the `loose-ends` skill",
        "writes: `- [ ] <text> #question|#assumption|#deferred (<source>)`. An entry is deleted in the",
        "commit that settles it rather than ticked, so the length of this file means something.",
        "",
    ],
};

function skeletons(target) {
    for (const [file, lines] of Object.entries(SKELETONS)) {
        if (fs.existsSync(path.join(target, file))) { step("seed", "100644", "yours", file); continue; }
        write(target, file, lines.join("\n"));
        step("seed", "100644", "created", file, "seeded");
    }
}

// ---------------------------------------------------------------- merging

// git merge-file writes the merged result and reports the number of conflicts, or a negative status
// for trouble. Used rather than a hand-rolled diff3 because the target already needs Git.
function threeWay(base, ours, theirs) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-"));
    const f = n => path.join(dir, n);
    try {
        fs.writeFileSync(f("base"), base);
        fs.writeFileSync(f("ours"), ours);
        fs.writeFileSync(f("theirs"), theirs);
        const r = lib.run("git", ["merge-file", "-L", "yours", "-L", "upstream (base)", "-L", "upstream (new)",
            f("ours"), f("base"), f("theirs")]);
        return { text: fs.readFileSync(f("ours"), "utf8"), conflicts: r.status > 0, failed: r.status < 0 };
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------- reporting

const notes = { written: [], merged: [], conflicted: [], seeded: [], kept: [], skipped: [], template: [], check: null };
const say = m => console.log(m);
function fail(m) { console.error(`update-harness: ${m}`); process.exit(1); }

// An install rewrites someone else's repository, so it says what it did to every path while it does
// it, and --quiet asks for the summary alone. The mode is worth a column of its own: a hook that
// lands 100644 gates nothing and a skill link written as a regular file leaves the agent with no
// skills, and both look installed. One call records the outcome and prints the line, so the running
// commentary and the summary below cannot drift apart.
const quiet = flag("--quiet");
const mode = f => f.link ? "120000" : f.exec ? "100755" : "100644";
function step(policy, m, outcome, file, bucket) {
    if (bucket) notes[bucket].push(file);
    if (!quiet) say(`  ${policy.padEnd(9)}${m}  ${outcome.padEnd(12)}${file}`);
}
const phase = m => { if (!quiet) say(`\n${m}`); };

function write(target, file, text, exec) {
    const full = path.join(target, file);
    if (dryRun) return;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
    if (exec) carryMode(target, file);
}

// ---------------------------------------------------------------- the self check

// Merging is not checking. The installer knows it wrote a file; it cannot know whether the result
// still works -- an AGENTS.md whose chain table no longer parses, routing sections naming an agent
// this repo does not have, a skill nothing links to, an upstream with no licence row. The suite
// answers all of that, and it is the upstream's own: fixtures that prove a harness are no use to a
// project carrying one, so they do not travel.
//
// So they are borrowed. Written in, run, and taken away again, leaving the repo as the install left
// it. Running them from the upstream checkout instead would be tidier and does not work: both
// lib.js files resolve the repo root from __dirname with no override, so the suite only ever tests
// the checkout it sits in.
const SUITE = [".agents/hooks/test.js", ".agents/hooks/tests/"];
const wantedBySuite = file => SUITE.some(p => p.endsWith("/") ? file.startsWith(p) : file === p);

function selfCheck(target, templateDir, head, files) {
    const borrowed = [];
    for (const { file } of files) {
        if (!wantedBySuite(file)) continue;
        // Anything already at one of these paths is the project's own: it is not overwritten here,
        // and the cleanup below must not remove it either, so it is left out of the borrowed list.
        if (fs.existsSync(path.join(target, file))) continue;
        const text = blob(templateDir, head, file);
        if (text === null) continue;
        write(target, file, text);
        borrowed.push(file);
    }
    phase(`self check: ${borrowed.length} file(s) borrowed from the upstream suite`);
    if (!borrowed.length) return { skipped: "the suite is already in this repo; run it yourself with node .agents/hooks/test.js" };

    try {
        const r = lib.node([path.join(target, ".agents/hooks/test.js")], { cwd: target });
        const lines = r.output.split(/\r?\n/).filter(l => l.trim());
        return { failed: r.status !== 0, summary: lines[lines.length - 1] || "no output", output: r.output };
    } finally {
        // Only what this function wrote, and only the directories that writing it created.
        for (const file of borrowed) { try { fs.rmSync(path.join(target, file)); } catch { /* already gone */ } }
        const dirs = [...new Set(borrowed.map(f => path.dirname(f)))].sort((a, b) => b.length - a.length);
        for (const dir of dirs) { try { fs.rmdirSync(path.join(target, dir)); } catch { /* the project's, or not empty */ } }
    }
}

// ---------------------------------------------------------------- the run

function main() {
    const target = targetRoot();
    if (!fs.existsSync(path.join(target, ".git"))) fail(`${target} is not a git checkout`);

    const lockPath = path.join(target, LOCK);
    const previous = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, "utf8")) : null;
    const ref = value("--ref", previous ? previous.ref : DEFAULT_REF);
    const { dir: templateDir, temporary } = templateCheckout(ref);

    try {
        const head = at(templateDir, ["rev-parse", "HEAD"]).output.trim();
        // A base is what makes this an update rather than an overwrite. Without one -- a first
        // install, or an upstream whose history was rewritten -- an existing file is left alone
        // instead of being guessed at, and the run says so.
        let base = previous ? previous.commit : null;
        if (base && at(templateDir, ["cat-file", "-e", `${base}^{commit}`]).status !== 0) {
            say(`the recorded upstream commit ${base.slice(0, 8)} is not in ${TEMPLATE} any more, so this run has no merge base: existing files are left alone`);
            base = null;
        }
        if (previous && base === head) { say(`harness is already at ${head.slice(0, 8)} (${ref}); nothing to update`); return; }

        // A repo carrying a harness from before harness-lock.json existed. Without a base the rule
        // below keeps every file that is already there, which protects the project's work and also
        // preserves the old harness: its checks then run against the new skills and agents and fail,
        // naming rules this version dropped. Worth saying out loud, because the run otherwise looks
        // like a success.
        const MARKERS = [".agents/hooks/lib.js", "scripts/lib.js", ".githooks/pre-commit"];
        const stale = !previous && MARKERS.filter(f => fs.existsSync(path.join(target, f)));
        if (stale && stale.length) {
            if (adopt) say(`this repo has a harness but no ${LOCK}, and --adopt was given: harness files are replaced with ${ref}'s, and edits to them are lost`);
            else say(`this repo has a harness (${stale.join(", ")}) but no ${LOCK}, so it predates the receipt and there is no merge base.\nEvery harness file already here is kept, which leaves old checks running against new skills. Re-run with --adopt to replace them, or --dry-run --quiet to list them first.`);
        }

        const rows = policies(templateDir);
        const files = templateFiles(templateDir);
        const skills = [];

        phase(`${files.length} path(s) in ${ref} at ${head.slice(0, 8)}`);
        for (const entry of files) {
            const { file, link: isLink, exec } = entry;
            const policy = policyFor(rows, file);
            const m = mode(entry);
            const theirs = blob(templateDir, head, file);
            if (theirs === null) continue;
            const full = path.join(target, file);
            const exists = fs.existsSync(full);

            // Not installed anywhere, and named in one line of the summary instead: sixty-five
            // lines saying nothing happened bury the thirty-eight saying something did.
            if (policy === "template") { notes.template.push(file); continue; }
            if (isLink) {
                // A skill link is relink's to make, once the directory it lives in exists: it knows
                // which skills this project actually has, where the upstream only knows its own.
                if (policy === "skills") {
                    if (!dryRun) fs.mkdirSync(path.dirname(full), { recursive: true });
                    continue;
                }
                const how = link(target, file, theirs.trim());
                step(policy, m, how === "kept" ? "yours" : how || "unchanged", file, how);
                continue;
            }
            // Reported one line per skill by mergeSkills below, not one per reference file: a skill
            // is the unit a project installs, and its files run to several hundred.
            if (policy === "skills") { skills.push(file); continue; }
            // Reported only when the target actually has it: "left alone, yours" about a file the
            // repo does not have names something that was never there.
            if (policy === "skip") { step(policy, m, exists ? "yours" : "absent", file, exists && "skipped"); continue; }

            if (policy === "seed") {
                if (exists) { step(policy, m, "yours", file, "kept"); continue; }
                write(target, file, theirs, exec);
                step(policy, m, "created", file, "seeded");
                continue;
            }
            // merge
            if (!exists) { write(target, file, theirs, exec); step(policy, m, "written", file, "written"); continue; }
            const ours = fs.readFileSync(full, "utf8");
            if (ours === theirs) { step(policy, m, "unchanged", file); continue; }
            if (base === null) {
                if (!adopt) { step(policy, m, "yours, no base", file, "kept"); continue; }
                write(target, file, theirs, exec);
                step(policy, m, "adopted", file, "written");
                continue;
            }
            const from = blob(templateDir, base, file);
            if (from === null) { step(policy, m, "yours, new here", file, "kept"); continue; }
            if (ours === from) { write(target, file, theirs, exec); step(policy, m, "written", file, "written"); continue; }
            const merged = threeWay(from, ours, theirs);
            if (merged.failed) { step(policy, m, "yours, merge failed", file, "kept"); continue; }
            write(target, file, merged.text, exec);
            if (merged.conflicts) step(policy, m, "CONFLICT", file, "conflicted");
            else step(policy, m, "merged", file, "merged");
        }

        phase("skeletons a project starts with");
        skeletons(target);
        phase("skills, merged by name");
        mergeSkills(target, templateDir, head, skills);

        if (!dryRun) {
            fs.writeFileSync(lockPath, JSON.stringify({
                template: TEMPLATE, ref, commit: head, ...installer(),
                updated: new Date().toISOString().slice(0, 10),
            }, null, 2) + "\n");
            finish(target);
            // After finish(), because the suite checks the links relink has just written.
            if (!flag("--no-check")) notes.check = selfCheck(target, templateDir, head, files);
        }
        report(target, head, ref, base);
    } finally {
        if (temporary) fs.rmSync(templateDir, { recursive: true, force: true });
    }
}

// Skills merge by name, not by content: the upstream's are added and updated, and a skill the
// project vendored itself is never removed. skills-lock.json is the union, the project's entry
// winning where both name the same skill, so a project that pinned a different source keeps it.
function mergeSkills(target, templateDir, head, files) {
    const SKILLS = ".agents/skills/";
    const ours = path.join(target, "skills-lock.json");
    const theirLock = JSON.parse(blob(templateDir, head, "skills-lock.json") || '{"skills":{}}');
    const ourLock = fs.existsSync(ours) ? JSON.parse(fs.readFileSync(ours, "utf8")) : { skills: {} };
    ourLock.skills = ourLock.skills || {};

    const mine = new Set(Object.keys(ourLock.skills));
    // One line per skill, not per file. Outcome is decided across the whole folder: a skill counts
    // as changed the moment any file in it did, and only an untouched folder reads "unchanged".
    const outcomes = new Map();
    const seen = name => outcomes.get(name) || outcomes.set(name, { added: 0, updated: 0, files: 0 }).get(name);
    for (const file of files) {
        if (!file.startsWith(SKILLS)) continue;                 // .claude/skills links are rebuilt, not copied
        const name = file.slice(SKILLS.length).split("/")[0];
        const tally = seen(name);
        tally.files++;
        // A skill the project installed under a name the upstream also uses stays the project's.
        if (mine.has(name) && !theirLock.skills[name]) { tally.yours = true; continue; }
        const text = blob(templateDir, head, file);
        if (text === null) continue;
        const full = path.join(target, file);
        const exists = fs.existsSync(full);
        if (exists && fs.readFileSync(full, "utf8") === text) continue;
        write(target, file, text);
        if (exists) { tally.updated++; notes.merged.push(file); }
        else { tally.added++; notes.written.push(file); }
    }
    for (const [name, t] of [...outcomes].sort()) {
        const what = t.yours ? "yours" : t.added ? "added" : t.updated ? "updated" : "unchanged";
        step("skills", "100644", what, `${SKILLS}${name}  (${t.files} file(s))`);
    }
    for (const [name, entry] of Object.entries(theirLock.skills)) {
        if (!ourLock.skills[name]) ourLock.skills[name] = entry;
    }
    if (!dryRun) fs.writeFileSync(ours, JSON.stringify(ourLock, null, 2) + "\n");
}

// Two files nothing copied: the per-harness skill links, which depend on which skills this project
// has rather than which the upstream ships, and the third-party notice, which must describe this
// project's lock file. Both are generated, so the install leaves a harness that works rather than a
// list of commands to remember.
function finish(target) {
    phase("links and notices");
    for (const [label, args] of [["links", ["relink"]], ["notices", ["notices"]]]) {
        const r = lib.node([path.join(target, "scripts/skills.js"), ...args], { cwd: target });
        say(r.status === 0 ? r.output : `${label}: ${r.output}`);
    }
}

function report(target, head, ref, base) {
    // Every path was named as it happened, so repeating the lists here doubles the output; a quiet
    // run never saw them and gets them in full. Conflicts are listed either way: they are what the
    // reader has to act on, and they belong beside the instructions for acting on them.
    const list = (label, arr, always) => {
        if (!arr.length) return;
        if (quiet || always) say(`\n${label} (${arr.length}):\n  ${arr.sort().join("\n  ")}`);
        else say(`\n${label}: ${arr.length}`);
    };
    say("");
    say(dryRun ? `dry run against ${ref} at ${head.slice(0, 8)}` : `harness updated to ${ref} at ${head.slice(0, 8)}`);
    if (!base) say("no merge base: this was an install, so nothing that already existed was changed");
    list("added", notes.written);
    list("merged", notes.merged);
    list("created for the first time", notes.seeded);
    list("left alone, yours", notes.kept.concat(notes.skipped));
    // Named rather than listed: the fixtures alone are sixty files, and the point is the rule, not
    // the inventory. Nothing a project runs reaches any of it.
    if (notes.template.length) {
        const named = notes.template.filter(f => !f.startsWith(".agents/hooks/tests/"));
        say(`\nnot installed, the upstream's own (${notes.template.length}): ${named.join(", ")}, and the suite's fixtures`);
    }
    if (notes.conflicted.length) {
        list("CONFLICTED, resolve the markers by hand", notes.conflicted, true);
        say(`\nEach one holds <<<<<<< yours / ======= / >>>>>>> upstream (new). Resolve them, then run the suite:\n  node .agents/hooks/test.js`);
    }
    const check = notes.check;
    if (check && check.skipped) say(`\nself check skipped: ${check.skipped}`);
    else if (check && check.failed) say(`\nSELF CHECK FAILED, so this install does not work yet:\n${check.output}`);
    else if (check) say(`\nself check: ${check.summary}, run from the upstream suite and removed again`);

    if (!dryRun) {
        const suite = fs.existsSync(path.join(target, ".agents/hooks/test.js"));
        say(`\nIn ${target}, point Git at the hooks once per clone:`);
        say(`  node scripts/githooks-init.js${suite ? " && node .agents/hooks/test.js" : " && node scripts/docs-check.js"}`);
    }
    if (notes.conflicted.length || (check && check.failed)) process.exit(1);
}

main();
