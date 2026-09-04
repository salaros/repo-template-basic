// .agents/hooks/lib.js
// Shared by the hook scripts: the one place that knows how a harness hands a hook its payload,
// where the repo root is, and how the harness's tab-separated tables are read.
//   const lib = require("./lib");
//   const root = lib.root();                 // repo root (see below)
//   const payload = lib.payload();           // stdin parsed as JSON, or null (warned on stderr)
//   const files = lib.filePaths(payload, root); // edited file(s), repo-relative, forward slashes
//   lib.node(["scripts/skills.js", "check"]) // run a script with this node; { status, output }
//   lib.readTsv("scripts/stacks.tsv")        // rows as arrays of cells; blank and # lines skipped
// Root: CLAUDE_PROJECT_DIR, CURSOR_PROJECT_DIR or GEMINI_PROJECT_DIR when set, else the checkout
// these hooks live in; a variable naming another checkout is used and reported on stderr.
// Paths: tool_input.file_path (Claude Code, Gemini CLI), file_path at the top level (Cursor
// afterFileEdit) or toolArgs.path with toolArgs a JSON string (Copilot). A path outside the root
// is dropped. Fails open: an unreadable payload yields null and says why on stderr.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const win = process.platform === "win32";
const checkout = path.resolve(__dirname, "..", "..");
const warn = msg => process.stderr.write(`hook: ${msg}\n`);
const same = (a, b) => win ? a.toLowerCase() === b.toLowerCase() : a === b;

// Git Bash reports C:\x as /c/x; Windows APIs may prefix \\?\. Bring both to a form path can resolve.
const fix = p => {
    let s = String(p).replace(/^\\\\\?\\/, "");
    if (win) { const m = s.match(/^\/([a-zA-Z])(?:\/(.*))?$/); if (m) s = `${m[1].toUpperCase()}:/${m[2] || ""}`; }
    return s;
};
const real = p => { try { return fs.realpathSync(p); } catch { return p; } };

function root() {
    const here = real(checkout);
    for (const v of ["CLAUDE_PROJECT_DIR", "CURSOR_PROJECT_DIR", "GEMINI_PROJECT_DIR"]) {
        const val = process.env[v];
        if (!val) continue;
        const dir = path.resolve(fix(val));
        let st; try { st = fs.statSync(dir); } catch { }
        if (!st || !st.isDirectory()) { warn(`${v} is not a directory; using the checkout these hooks live in`); break; }
        if (!same(real(dir), here)) warn(`${v} (${dir}) is not the checkout these hooks live in (${here}); using ${v}`);
        return dir;
    }
    return here;
}

function stdin() { try { return fs.readFileSync(0, "utf8"); } catch { return ""; } }

function payload() {
    const raw = stdin();
    let j;
    try { j = JSON.parse(raw); } catch { warn(`payload is not JSON (${raw.length} bytes)`); return null; }
    if (!j || typeof j !== "object") { warn("payload is not a JSON object"); return null; }
    return j;
}

function filePaths(j, rootDir) {
    if (!j) return [];
    const found = [];
    const ti = j.tool_input;
    if (ti && typeof ti === "object")
        for (const k of ["file_path", "notebook_path", "path", "filePath"]) if (typeof ti[k] === "string") found.push(ti[k]);
    if (typeof j.file_path === "string") found.push(j.file_path);
    let ta = j.toolArgs;
    if (typeof ta === "string") { try { ta = JSON.parse(ta); } catch { ta = null; } }
    if (ta && typeof ta === "object" && typeof ta.path === "string") found.push(ta.path);
    if (!found.length) { warn(`no file path in payload (keys: ${Object.keys(j).join(", ") || "none"})`); return []; }
    const out = new Set();
    for (const p of found) {
        const rel = path.relative(rootDir, path.resolve(rootDir, fix(p)));
        if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue;   // outside the repo
        out.add(rel.split(path.sep).join("/"));
    }
    return [...out];
}

// Runs a command; output is stdout and stderr combined, status is the exit code (-1 if it could not start).
function run(cmd, args, opts = {}) {
    const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
    const output = ((r.stdout || "") + (r.stderr || "")).replace(/\s+$/, "");
    return { status: r.status === null ? -1 : r.status, output: r.error ? `${r.error.message}${output ? "\n" + output : ""}` : output };
}
const node = (args, opts) => run(process.execPath, args, opts);
const shell = (cmd, opts) => run(cmd, [], { shell: true, ...opts });

function readTsv(file) {
    return fs.readFileSync(file, "utf8").split(/\r?\n/)
        .filter(l => l.trim() && !l.startsWith("#"))
        .map(l => l.split("\t"));
}

module.exports = { checkout, warn, fix, root, stdin, payload, filePaths, run, node, shell, readTsv };
