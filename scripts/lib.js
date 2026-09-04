// scripts/lib.js
// Small process and table-reading helpers shared by scripts and, through .agents/hooks/lib.js, by
// the hooks. Nothing here knows about a harness's hook payload; that lives in .agents/hooks/lib.js,
// which requires this file rather than the other way around, so scripts/ never reaches into the
// harness-specific folder.
//   const lib = require("./lib");
//   const root = lib.chdirRoot();            // cd to the repo root (this file is one level under it), return it
//   lib.stdin()                              // everything on stdin, or "" if there is none
//   lib.node(["scripts/skills.js", "missing"]) // run a script with this node; { status, output }
//   lib.shell("npm install")                 // run a command through the OS shell
//   lib.readTsv("scripts/stacks.tsv")        // rows as arrays of cells; blank and # lines skipped
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// Every script under scripts/ resolves the repo root from its own location (scripts/README.md,
// "Conventions") and chdirs there so its relative paths (SKILL.md files, README.md, stacks.tsv)
// work no matter where it was invoked from.
function chdirRoot() {
    const root = path.resolve(__dirname, "..");
    process.chdir(root);
    return root;
}

function stdin() { try { return fs.readFileSync(0, "utf8"); } catch { return ""; } }

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

module.exports = { chdirRoot, stdin, run, node, shell, readTsv };
