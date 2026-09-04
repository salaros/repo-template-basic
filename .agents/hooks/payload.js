// .agents/hooks/payload.js
// The JSON half of lib.sh: reads the harness payload on stdin and prints what the hook asked for.
//   node payload.js path <root>   -> edited file path(s), repo-relative, forward slashes, one per line
// Shapes: tool_input.file_path (Claude Code, Gemini CLI), file_path at the top level (Cursor
// afterFileEdit), toolArgs.path where toolArgs is a JSON string (Copilot). Anything outside <root>
// is dropped. Problems go to stderr and the output stays empty, so the calling hook fails open.
const fs = require("fs");
const path = require("path");

const [mode, rootArg] = process.argv.slice(2);
const warn = msg => process.stderr.write(`hook payload: ${msg}\n`);
const win = process.platform === "win32";

// Git Bash reports C:\x as /c/x; Windows APIs may prefix \\?\. Bring both to a form path can resolve.
const fix = p => {
    let s = String(p).replace(/^\\\\\?\\/, "");
    if (win) { const m = s.match(/^\/([a-zA-Z])(?:\/(.*))?$/); if (m) s = `${m[1].toUpperCase()}:/${m[2] || ""}`; }
    return s;
};

let raw = "";
try { raw = fs.readFileSync(0, "utf8"); } catch { }
let j;
try { j = JSON.parse(raw); } catch { warn(`payload is not JSON (${raw.length} bytes)`); process.exit(0); }
if (!j || typeof j !== "object") { warn("payload is not a JSON object"); process.exit(0); }

if (mode !== "path") { warn(`unknown mode "${mode}"`); process.exit(0); }
if (!rootArg) { warn("no root given"); process.exit(0); }
const root = path.resolve(fix(rootArg));

const found = [];
const ti = j.tool_input;
if (ti && typeof ti === "object")
    for (const k of ["file_path", "notebook_path", "path", "filePath"]) if (typeof ti[k] === "string") found.push(ti[k]);
if (typeof j.file_path === "string") found.push(j.file_path);
let ta = j.toolArgs;
if (typeof ta === "string") { try { ta = JSON.parse(ta); } catch { ta = null; } }
if (ta && typeof ta === "object" && typeof ta.path === "string") found.push(ta.path);

if (!found.length) { warn(`no file path in payload (keys: ${Object.keys(j).join(", ") || "none"})`); process.exit(0); }

const out = new Set();
for (const p of found) {
    const rel = path.relative(root, path.resolve(root, fix(p)));
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) continue;   // outside the repo
    out.add(rel.split(path.sep).join("/"));
}
if (out.size) process.stdout.write([...out].join("\n") + "\n");
