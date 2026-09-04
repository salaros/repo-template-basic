#!/bin/sh
# .agents/hooks/lib.sh
# Shared by the hook scripts: the one place that knows how a harness hands a hook its payload.
# Source it, read the payload once, then ask for the facts a hook needs:
#   . "$(dirname -- "$0")/lib.sh"
#   hook_read                    # stdin -> $HOOK_PAYLOAD; repo root -> $HOOK_ROOT
#   files=$(hook_file_path)      # edited file(s), repo-relative, forward slashes, one per line
# Root: CLAUDE_PROJECT_DIR, CURSOR_PROJECT_DIR or GEMINI_PROJECT_DIR when set, else the checkout
# these hooks live in; a variable naming another checkout is used and reported on stderr.
# Paths: tool_input.file_path (Claude Code, Gemini CLI), file_path (Cursor afterFileEdit) or
# toolArgs.path with toolArgs a JSON string (Copilot); see payload.js. A path outside the root
# prints nothing. Fails open: an unreadable payload prints nothing and says why on stderr.
hook_lib_dir=$(cd -P -- "$(dirname -- "$0")" && pwd)

hook_root() {
    checkout=$(cd -P -- "$hook_lib_dir/../.." && pwd)
    for var in CLAUDE_PROJECT_DIR CURSOR_PROJECT_DIR GEMINI_PROJECT_DIR; do
        eval "val=\${$var:-}"
        [ -n "$val" ] || continue
        if ! val=$(cd -P -- "$val" 2>/dev/null && pwd); then
            echo "lib.sh: $var is not a directory; using the checkout these hooks live in" >&2
            break
        fi
        [ "$val" = "$checkout" ] || echo "lib.sh: $var ($val) is not the checkout these hooks live in ($checkout); using $var" >&2
        printf '%s\n' "$val"
        return 0
    done
    printf '%s\n' "$checkout"
}

hook_read() {
    HOOK_PAYLOAD=$(cat)
    HOOK_ROOT=$(hook_root)
}

hook_file_path() {
    command -v node >/dev/null 2>&1 || { echo "lib.sh: node is required to read the hook payload; nothing checked" >&2; return 0; }
    printf '%s' "$HOOK_PAYLOAD" | node "$hook_lib_dir/payload.js" path "$HOOK_ROOT"
}
