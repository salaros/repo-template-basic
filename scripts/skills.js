#!/usr/bin/env node
// scripts/skills.js
// The one place that knows the skill roster: what is installed, how each skill is invoked, which
// agent routes it, where it came from, and how the per-harness links are laid out. Inputs are
// skills-lock.json, the frontmatter of .agents/skills/*/SKILL.md, and the Route tables in
// .agents/agents/*.md. Callers: .agents/hooks/session-start.js, check-edit.js and test.js.
// Everything here reports; nothing obliges. A project built on this template decides for itself
// which skills it installs and which agent, if any, routes each one.
//   node scripts/skills.js list             every installed skill: name, invocation, agents, source
//   node scripts/skills.js missing          skills in the lock but not on disk, one per line; exit 1 if any
//   node scripts/skills.js vendored <name>  exit 0 when <name> is recorded in skills-lock.json
//   node scripts/skills.js relink           link every installed skill into each <dir>/skills, as a relative symlink
//   node scripts/skills.js install          restore every skill in skills-lock.json with npx skills, then relink
const fs = require("fs");
const path = require("path");
const lib = require("./lib");

const root = lib.chdirRoot();
const SKILLS = ".agents/skills", AGENTS = ".agents/agents", LOCK = "skills-lock.json";

const lock = () => fs.existsSync(LOCK) ? (JSON.parse(fs.readFileSync(LOCK, "utf8")).skills || {}) : {};
const frontmatter = file => {
    const m = fs.readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const fm = {};
    if (m) for (const line of m[1].split(/\r?\n/)) { const k = line.match(/^([\w-]+):\s*(.*)$/); if (k) fm[k[1]] = k[2].trim(); }
    return fm;
};
const installed = () => fs.existsSync(SKILLS)
    ? fs.readdirSync(SKILLS).filter(n => fs.existsSync(path.join(SKILLS, n, "SKILL.md"))).sort() : [];
const agents = () => {   // agent name -> Set of backticked names in its body (Route table and Steps alike)
    const out = {};
    if (!fs.existsSync(AGENTS)) return out;
    for (const f of fs.readdirSync(AGENTS).filter(n => n.endsWith(".md")).sort()) {
        const file = path.join(AGENTS, f);
        const name = frontmatter(file).name || f.replace(/\.md$/, "");
        const body = fs.readFileSync(file, "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
        out[name] = new Set([...body.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)].map(m => m[1]));
    }
    return out;
};
const roster = () => {
    const l = lock(), a = agents();
    return installed().map(name => {
        const fm = frontmatter(path.join(SKILLS, name, "SKILL.md"));
        return {
            name,
            invoke: fm["disable-model-invocation"] === "true" ? `\`/${name}\`` : "by description",
            agents: Object.keys(a).filter(k => a[k].has(name)),
            source: l[name] ? l[name].source : "local",
        };
    });
};
const commands = {
    list() {
        for (const r of roster()) console.log(`${r.name}\t${r.invoke.replace(/`/g, "")}\t${r.agents.join(",") || "-"}\t${r.source}`);
    },
    missing() {
        const on = new Set(installed());
        const gone = Object.keys(lock()).filter(n => !on.has(n));
        if (gone.length) { console.log(gone.join("\n")); process.exit(1); }
    },
    vendored(name) {
        if (!name) { console.error("usage: skills.js vendored <name>"); process.exit(2); }
        process.exit(lock()[name] ? 0 : 1);
    },
    relink() {
        // `npx skills` creates absolute junctions on Windows; Git needs relative symlinks. It also
        // only links what it vendored, so a local skill written by hand has no link at all and the
        // harness never sees it. A directory that already holds skill links gets one per installed
        // skill, which is what makes a hand-written skill visible without anyone remembering to
        // create the link. Directories are discovered rather than listed: whichever harnesses this
        // clone wires up, the ones with a skills/ folder are the ones that want links.
        const canonical = path.resolve(root, SKILLS);
        const same = (a, b) => process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
        const inside = p => same(p.slice(0, canonical.length), canonical);
        const present = p => { try { fs.lstatSync(p); return true; } catch { return false; } };
        let fixed = 0, kept = 0, added = 0;
        const dangling = [];
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
                if (!inside(resolved)) continue;                    // points elsewhere: not ours
                // The skill it names is gone: uninstalled, or renamed. Reported, never deleted,
                // because the answer is a `npx skills` command rather than a guess made here.
                if (!fs.existsSync(resolved)) { dangling.push(`${top.name}/skills/${name}`); continue; }
                const rel = path.relative(dir, resolved).split(path.sep).join("/");
                if (!path.isAbsolute(target) && target.split(path.sep).join("/") === rel) { kept++; continue; }
                try { fs.unlinkSync(link); } catch { fs.rmdirSync(link); }   // dir symlinks and junctions on Windows need rmdir
                fs.symlinkSync(rel, link, "dir");
                fixed++;
            }
            for (const name of installed()) {
                const link = path.join(dir, name);
                if (present(link)) continue;
                const rel = path.relative(dir, path.join(canonical, name)).split(path.sep).join("/");
                fs.symlinkSync(rel, link, "dir");
                added++;
            }
        }
        console.log(`skill links: ${added} created, ${fixed} rewritten as relative, ${kept} already relative`);
        for (const d of dangling) console.log(`${d} points at a skill that is not installed: remove the link, or restore the skill`);
    },
    install() {
        // Skills are committed, so a normal clone never needs this; run it when .agents/skills is missing
        // or damaged, or after a merge that changed the lock (the post-merge Git hook does).
        if (!fs.existsSync(LOCK)) { console.error(`${LOCK} not found in ${root}`); process.exit(1); }
        const r = lib.shell("npx --yes skills@latest experimental_install", { stdio: "inherit" });
        if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
        commands.relink();
        console.log(`Skills restored from ${LOCK}.`);
    },
};

const [cmd, ...args] = process.argv.slice(2);
if (!commands[cmd]) { console.error(`usage: node scripts/skills.js <${Object.keys(commands).join("|")}>`); process.exit(2); }
commands[cmd](...args);
