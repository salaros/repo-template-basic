#!/usr/bin/env node
// scripts/docs-check.js
// Checks the documentation chain. The chain itself is the table in AGENTS.md ("Documentation"):
// every row whose "Lives in" is docs/<stage>/ is a document stage, in table order, and the folder
// name gives the ID prefix (docs/ears/ -> EARS). This script reads that table, so the stage list
// is written nowhere else, and reports: a table it cannot read, a stage folder or name that does
// not fit, a skill named in the table that is not under .agents/skills/, and then, per document:
// the ID its file name gives it, the upstream documents it was derived from, and every citation
// (DOC-ID or DOC-ID/ITEM) pointing backwards along the chain to something that exists.
// Prints one line per problem and exits 1 when there are any. The edit hook requires check().
// Usage: node scripts/docs-check.js [docs-dir] [agents-file]   (defaults: docs, AGENTS.md)
const fs = require("fs");
const path = require("path");

function check(root = "docs", agentsFile = "AGENTS.md") {
    process.chdir(path.resolve(__dirname, ".."));
    const problems = [];
    const say = (file, msg) => problems.push(`${file}: ${msg}`);

    // 1. The chain, from the AGENTS.md table: | Stage | ... | Lives in | Skill |
    const chain = [];            // folder names in stage order, e.g. ["brd", "prd", ...]
    {
        const text = fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, "utf8") : "";
        const lines = text.split(/\r?\n/);
        const cells = l => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        const header = lines.findIndex(l => /^\|/.test(l) && cells(l).includes("Stage") && cells(l).includes("Lives in"));
        if (header < 0) say(agentsFile, "no chain table found (a Markdown table with Stage and Lives in columns)");
        else {
            const cols = cells(lines[header]);
            const at = (row, name) => row[cols.indexOf(name)] || "";
            for (let i = header + 2; i < lines.length && /^\|/.test(lines[i]); i++) {
                const row = cells(lines[i]);
                const stage = at(row, "Stage");
                const lives = (at(row, "Lives in").match(/`([^`]+)`/) || [])[1] || "";
                for (const skill of at(row, "Skill").matchAll(/`([^`]+)`/g))
                    if (!fs.existsSync(path.join(".agents/skills", skill[1], "SKILL.md")))
                        say(agentsFile, `stage ${stage} names skill \`${skill[1]}\`, which is not under .agents/skills/`);
                const m = lives.match(/^docs\/([a-z0-9-]+)\/$/);
                if (!m) continue;                                   // tests/, .scratch/, src/: not a document stage
                if (m[1].toUpperCase() !== stage) say(agentsFile, `stage ${stage} lives in ${lives}; the folder must be docs/${stage.toLowerCase()}/`);
                chain.push(m[1]);
            }
            if (!chain.length) say(agentsFile, "chain table has no row living in docs/<stage>/");
        }
    }
    const rank = Object.fromEntries(chain.map((s, i) => [s, i]));
    const prefixes = chain.map(s => s.toUpperCase());
    const refRe = new RegExp(`\\b(${prefixes.join("|") || "NONE"})-(\\d{4})(?:\\/([A-Z]{1,5}-\\d+))?\\b`, "g");
    const docs = new Map();      // "EARS-0003" -> { file, stage, items:Set, text }

    // 2. Collect documents: docs/<stage>/NNNN-<slug>.md -> <STAGE>-NNNN
    for (const stage of chain) {
        const dir = path.join(root, stage);
        if (!fs.existsSync(dir)) continue;
        const seen = new Map();
        for (const name of fs.readdirSync(dir).filter(n => n.endsWith(".md") && n !== "README.md")) {
            const file = path.join(dir, name).split(path.sep).join("/");
            const m = name.match(/^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/);
            if (!m) { say(file, "file name must be NNNN-<kebab-slug>.md"); continue; }
            const id = `${stage.toUpperCase()}-${m[1]}`;
            if (seen.has(m[1])) say(file, `number ${m[1]} already used by ${seen.get(m[1])}`);
            seen.set(m[1], name);
            const text = fs.readFileSync(file, "utf8");
            const items = new Set();
            for (const line of text.split(/\r?\n/)) {
                const im = line.match(/^(?:[-*]\s+|#{1,6}\s+|\*\*|\|\s*)?([A-Z]{1,5}-\d+)\b/);
                if (im) items.add(im[1]);
            }
            docs.set(id, { file, stage, items, text });
        }
    }

    // 3. Check each document
    const first = chain[0];
    for (const [id, d] of docs) {
        const lines = d.text.split(/\r?\n/);
        const h1 = lines.find(l => l.startsWith("# "));
        if (!h1) say(d.file, "no level-1 heading");
        else if (!h1.startsWith(`# ${id}:`)) say(d.file, `first heading must start with "# ${id}:" (found "${h1.slice(0, 40)}")`);

        const derived = lines.find(l => /^\**Derived from:?\**:?/i.test(l));
        if (!derived) { if (d.stage !== first) say(d.file, "missing a \"**Derived from:**\" line citing upstream document IDs"); }
        else if (d.stage !== first && !new RegExp(`(${prefixes.join("|")})-\\d{4}`).test(derived)) say(d.file, "\"Derived from:\" cites no document ID");

        for (const [ref, stage, num, item] of d.text.matchAll(refRe)) {
            const docId = `${stage}-${num}`;
            if (docId === id) continue;
            const target = docs.get(docId);
            if (!target) { say(d.file, `cites ${ref} but ${docId} does not exist`); continue; }
            if (rank[target.stage] > rank[d.stage]) say(d.file, `cites ${ref}, which is later in the chain (${target.stage} after ${d.stage})`);
            if (item && !target.items.has(item)) say(d.file, `cites ${ref} but ${target.file} has no item ${item}`);
        }
    }

    return { problems, summary: `docs-check: ${chain.length} stage(s) in ${agentsFile}, ${docs.size} document(s) under ${root}/, no problems` };
}

module.exports = { check };

if (require.main === module) {
    const { problems, summary } = check(...process.argv.slice(2));
    console.log(problems.length ? problems.join("\n") : summary);
    process.exit(problems.length ? 1 : 0);
}
