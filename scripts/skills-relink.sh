#!/bin/sh
# scripts/skills-relink.sh
# Rewrites the per-harness skill links (.claude/skills/<name>, and any other <dir>/skills/<name>
# that points into .agents/skills) as relative symlinks, so git stores them as links rather
# than copies. `npx skills` creates absolute junctions on Windows; on Linux/macOS its links are
# already relative and this script changes nothing. On Windows it needs Developer Mode or an
# elevated shell, because only those may create symlinks.
# Usage: sh scripts/skills-relink.sh
set -e

script_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$(dirname -- "$script_dir")"

command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 1; }

node - <<'EOF'
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const canonical = path.resolve(root, ".agents/skills");
const same = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
const inside = (p) => same(p.slice(0, canonical.length), canonical);
let fixed = 0, kept = 0;

for (const top of fs.readdirSync(root, { withFileTypes: true })) {
    if (!top.isDirectory() || top.name === ".agents" || top.name === ".git") continue;
    const dir = path.join(root, top.name, "skills");
    if (!fs.existsSync(dir)) continue;

    for (const name of fs.readdirSync(dir)) {
        const link = path.join(dir, name);
        const st = fs.lstatSync(link);
        if (!st.isSymbolicLink()) {
            if (st.isDirectory() && fs.existsSync(path.join(canonical, name)))
                console.log(`${top.name}/skills/${name} is a copy, not a link: delete it and re-run to link it`);
            continue;
        }
        const target = fs.readlinkSync(link).replace(/^\\\\\?\\/, "");
        const resolved = path.resolve(dir, target);
        if (!inside(resolved)) continue;                       // points elsewhere: not ours

        const rel = path.relative(dir, resolved).split(path.sep).join("/");
        if (!path.isAbsolute(target) && target.split(path.sep).join("/") === rel) { kept++; continue; }

        try { fs.unlinkSync(link); } catch { fs.rmdirSync(link); }  // dir symlinks/junctions on Windows need rmdir
        fs.symlinkSync(rel, link, "dir");
        fixed++;
    }
}
console.log(`skill links: ${fixed} rewritten as relative, ${kept} already relative`);
EOF
