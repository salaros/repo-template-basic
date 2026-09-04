#!/usr/bin/env node
// .agents/hooks/guard-command.js
// Refuses destructive shell commands before the harness runs them. Reads the harness's hook
// payload (JSON with the command somewhere inside) from stdin and matches the raw text, so the
// payload shape does not matter.
// Exit 2 = block, reason on stderr. Exit 0 = allow.
// Wire it to the pre-tool-use event of the shell tool (README, "Files per AI tool").
const lib = require("./lib");

// A token ends at a space, a JSON escape (backslash), the closing quote, or end of line.
const end = String.raw`( |\\|"|$)`;
const rules = [
    [new RegExp(String.raw`git push[^"]* (-f|--force)` + end, "m"), "force push (use --force-with-lease, and never on master/main)"],
    [/git (reset --hard|checkout -- \.|clean -[a-zA-Z]*f)/, "it discards uncommitted work"],
    [/git branch -D/, "it force-deletes a branch"],
    [new RegExp(String.raw`rm -[a-zA-Z]*[rR][a-zA-Z]* +(/|~|\$HOME|\.git|\*)` + end, "m"), "recursive delete of a root, home, .git or wildcard path"],
];

const payload = lib.stdin();
for (const [re, why] of rules) {
    if (!re.test(payload)) continue;
    process.stderr.write(`guard-command.js blocked this command: ${why}. If it is really needed, ask the user to run it.\n`);
    process.exit(2);
}
process.exit(0);
