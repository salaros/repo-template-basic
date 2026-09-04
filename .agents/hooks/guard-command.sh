#!/bin/sh
# .agents/hooks/guard-command.sh
# Refuses destructive shell commands before the harness runs them. Reads the harness's hook
# payload (JSON with the command somewhere inside) from stdin.
# Exit 2 = block, reason on stderr. Exit 0 = allow.
# Wire it to the pre-tool-use event of the shell tool (README, "Files per AI tool").
payload=$(cat)

deny() {
    echo "guard-command.sh blocked this command: $1. If it is really needed, ask the user to run it." >&2
    exit 2
}

matches() { printf '%s' "$payload" | grep -qE "$1"; }

# A token ends at a space, a JSON escape (backslash), the closing quote, or end of input
end='( |\\|"|$)'

matches "git push[^\"]* (-f|--force)$end"                         && deny "force push (use --force-with-lease, and never on master/main)"
matches "git (reset --hard|checkout -- \.|clean -[a-zA-Z]*f)"     && deny "it discards uncommitted work"
matches "git branch -D"                                           && deny "it force-deletes a branch"
matches "rm -[a-zA-Z]*[rR][a-zA-Z]* +(/|~|\\\$HOME|\.git|\*)$end"  && deny "recursive delete of a root, home, .git or wildcard path"
exit 0
