#!/bin/sh
# .agents/hooks/check-edit.sh
# Runs after the harness writes or edits a file. Reads the hook payload (JSON) from stdin, finds
# the file path in it, and checks what needs no project tooling: shell syntax for *.sh, JSON
# validity for *.json, the documentation chain for files under docs/, and a warning when a
# vendored skill was edited in place.
# Exit 2 = send the message on stderr back to the agent. Exit 0 = silent.
# Wire it to the post-tool-use event of the edit/write tools (README, "Files per AI tool").
command -v node >/dev/null 2>&1 || exit 0
cd "$(dirname -- "$0")/../.." || exit 0

file=$(node -e '
    let d = "";
    process.stdin.on("data", c => d += c).on("end", () => {
        let j = {}; try { j = JSON.parse(d); } catch {}
        const i = j.tool_input || j.input || {};
        process.stdout.write((i.file_path || i.path || i.filePath || "").replace(/\\/g, "/"));
    });
')
[ -n "$file" ] && [ -f "$file" ] || exit 0

# Vendored skills (recorded in skills-lock.json) must not be edited in place; local skills may be.
skill=$(node -e '
    const m = process.argv[1].match(/\/\.(?:agents|claude)\/skills\/([^/]+)\//);
    process.stdout.write(m ? m[1] : "");
' "$file")
if [ -n "$skill" ] && [ -f skills-lock.json ] \
   && node -e 'process.exit(require("./skills-lock.json").skills[process.argv[1]] ? 0 : 1)' "$skill"; then
    echo "$file belongs to the vendored skill '$skill': npx skills update will overwrite it. Change it upstream, or copy it to a new local skill under .agents/skills/<other-name>/." >&2
    exit 2
fi

case "$file" in
    *.sh)
        msg=$(sh -n "$file" 2>&1) || { echo "shell syntax error in $file: $msg" >&2; exit 2; } ;;
    *.json)
        msg=$(node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$file" 2>&1) \
            || { echo "invalid JSON in $file: $msg" >&2; exit 2; } ;;
    */docs/brd/*.md|*/docs/prd/*.md|*/docs/ears/*.md|*/docs/bdd/*.md|*/docs/adr/*.md|*/docs/spec/*.md)
        msg=$(sh scripts/docs-check.sh 2>&1) || { echo "documentation chain check failed (see AGENTS.md, Documentation; fix with the docs-check skill):" >&2; echo "$msg" >&2; exit 2; } ;;
esac
exit 0
