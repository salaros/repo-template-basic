#!/bin/sh
# .agents/hooks/check-edit.sh
# Runs after the harness writes or edits a file. Gets the edited path from lib.sh (repo-relative,
# whatever the harness sent) and checks what needs no project tooling: shell syntax for *.sh,
# node --check for *.js, JSON validity for *.json, the documentation chain for files under
# docs/<stage>/, the hook test suite when a hook itself changed, and a refusal when a vendored
# skill was edited in place.
# Exit 2 = send the message on stderr back to the agent. Exit 0 = silent.
# Wire it to the post-tool-use event of the edit/write tools (README, "Files per AI tool").
. "$(dirname -- "$0")/lib.sh"
hook_read
cd "$HOOK_ROOT" || exit 0
files=$(hook_file_path)
[ -n "$files" ] || exit 0

check_one() {
    file=$1
    [ -f "$file" ] || return 0

    # Vendored skills (recorded in skills-lock.json) must not be edited in place; local skills may be.
    case "$file" in
        .agents/skills/*/*|.claude/skills/*/*)
            skill=${file#*/skills/}; skill=${skill%%/*}
            if [ -f skills-lock.json ] && node -e 'process.exit(require("./skills-lock.json").skills[process.argv[1]] ? 0 : 1)' "$skill"; then
                echo "$file belongs to the vendored skill '$skill': npx skills update will overwrite it. Change it upstream, or copy it to a new local skill under .agents/skills/<other-name>/." >&2
                return 2
            fi ;;
    esac

    case "$file" in
        *.sh)
            msg=$(sh -n "$file" 2>&1) || { echo "shell syntax error in $file: $msg" >&2; return 2; } ;;
        *.js|*.mjs|*.cjs)
            msg=$(node --check "$file" 2>&1) || { echo "JavaScript syntax error in $file: $msg" >&2; return 2; } ;;
        *.json)
            msg=$(node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$file" 2>&1) \
                || { echo "invalid JSON in $file: $msg" >&2; return 2; } ;;
        docs/brd/*.md|docs/prd/*.md|docs/ears/*.md|docs/bdd/*.md|docs/adr/*.md|docs/spec/*.md)
            msg=$(sh scripts/docs-check.sh 2>&1) || { echo "documentation chain check failed (see AGENTS.md, Documentation; fix with the docs-check skill):" >&2; echo "$msg" >&2; return 2; } ;;
    esac

    # A hook, the lib or a fixture changed: the suite must still pass (HOOK_TEST stops recursion).
    case "$file" in
        .agents/hooks/*)
            [ -n "${HOOK_TEST:-}" ] && return 0
            msg=$(sh .agents/hooks/test.sh 2>&1) || { echo "hook tests failed after editing $file:" >&2; echo "$msg" >&2; return 2; } ;;
    esac
    return 0
}

status=0
set -f
IFS='
'
for f in $files; do
    check_one "$f" || status=2
done
exit $status
