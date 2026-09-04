#!/bin/sh
# .agents/hooks/check-edit.sh
# Runs after the harness writes or edits a file. Reads the hook payload (JSON) from stdin, finds
# the file path in it, and checks what needs no project tooling: shell syntax for *.sh, JSON
# validity for *.json, and a warning when a vendored skill was edited in place.
# Exit 2 = send the message on stderr back to the agent. Exit 0 = silent.
# Wire it to the post-tool-use event of the edit/write tools (README, "Files per AI tool").
command -v node >/dev/null 2>&1 || exit 0

file=$(node -e '
    let d = "";
    process.stdin.on("data", c => d += c).on("end", () => {
        let j = {}; try { j = JSON.parse(d); } catch {}
        const i = j.tool_input || j.input || {};
        process.stdout.write(i.file_path || i.path || i.filePath || "");
    });
')
[ -n "$file" ] && [ -f "$file" ] || exit 0

case "$file" in
    *.agents/skills/*|*.agents\\skills\\*|*.claude/skills/*|*.claude\\skills\\*)
        echo "$file is a vendored skill: npx skills update will overwrite it. Change the source repo, or fork it under another name outside .agents/skills." >&2
        exit 2 ;;
esac

case "$file" in
    *.sh)
        msg=$(sh -n "$file" 2>&1) || { echo "shell syntax error in $file: $msg" >&2; exit 2; } ;;
    *.json)
        msg=$(node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$file" 2>&1) \
            || { echo "invalid JSON in $file: $msg" >&2; exit 2; } ;;
esac
exit 0
