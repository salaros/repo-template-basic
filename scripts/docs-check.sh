#!/bin/sh
# scripts/docs-check.sh
# Checks the documentation chain under docs/ (AGENTS.md, "Documentation"): every document
# carries the ID its file name gives it, cites the upstream documents it was derived from,
# and every citation (DOC-ID or DOC-ID/ITEM) points backwards along the chain to something
# that exists. Prints one line per problem and exits 1 when there are any.
# Usage: sh scripts/docs-check.sh [docs-dir]   (default: docs)
script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")" || exit 1
command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }

node - "${1:-docs}" <<'EOF'
const fs = require("fs");
const path = require("path");

const root = process.argv[2];
const chain = ["brd", "prd", "ears", "bdd", "adr", "spec"];   // stage order; tdd lives in tests/, iplan in .scratch/
const rank = Object.fromEntries(chain.map((s, i) => [s, i]));
const docs = new Map();       // "EARS-0003" -> { file, stage, items:Set, text }
const problems = [];
const say = (file, msg) => problems.push(`${file}: ${msg}`);

// 1. Collect documents: docs/<stage>/NNNN-<slug>.md -> <STAGE>-NNNN
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

// 2. Check each document
for (const [id, d] of docs) {
    const lines = d.text.split(/\r?\n/);
    const h1 = lines.find(l => l.startsWith("# "));
    if (!h1) say(d.file, "no level-1 heading");
    else if (!h1.startsWith(`# ${id}:`)) say(d.file, `first heading must start with "# ${id}:" (found "${h1.slice(0, 40)}")`);

    const derived = lines.find(l => /^\**Derived from:?\**:?/i.test(l));
    if (!derived) { if (d.stage !== "brd") say(d.file, "missing a \"**Derived from:**\" line citing upstream document IDs"); }
    else if (d.stage !== "brd" && !/[A-Z]{3,5}-\d{4}/.test(derived)) say(d.file, "\"Derived from:\" cites no document ID");

    // every reference anywhere in the text must resolve and point backwards
    const refs = d.text.matchAll(/\b(BRD|PRD|EARS|BDD|ADR|SPEC)-(\d{4})(?:\/([A-Z]{1,5}-\d+))?\b/g);
    for (const [ref, stage, num, item] of refs) {
        const docId = `${stage}-${num}`;
        if (docId === id) continue;
        const target = docs.get(docId);
        if (!target) { say(d.file, `cites ${ref} but ${docId} does not exist`); continue; }
        if (rank[target.stage] > rank[d.stage]) say(d.file, `cites ${ref}, which is later in the chain (${target.stage} after ${d.stage})`);
        if (item && !target.items.has(item)) say(d.file, `cites ${ref} but ${target.file} has no item ${item}`);
    }
}

if (problems.length) { console.log(problems.join("\n")); process.exit(1); }
console.log(`docs-check: ${docs.size} document(s) under ${root}/, no problems`);
EOF
