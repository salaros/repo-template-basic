#!/bin/sh
# .agents/hooks/test.sh
# Runs the hook suite: every line of tests/cases.tsv is "<hook> <fixture> <expected exit> <note>".
# The fixture is piped to the hook as its payload with __ROOT__ replaced by this checkout, so the
# same fixtures work on any machine. Prints one FAIL line per mismatch and exits 1 if any.
# Usage: sh .agents/hooks/test.sh
dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$dir/../.." || exit 1
root=$(pwd)
export HOOK_TEST=1
unset CLAUDE_PROJECT_DIR CURSOR_PROJECT_DIR GEMINI_PROJECT_DIR

# A chain document with a wrong heading, so the docs-check path can be exercised; removed after.
made_dir=""
[ -d docs/brd ] || { mkdir -p docs/brd; made_dir=docs/brd; }
printf '# Wrong heading\n' > docs/brd/9999-hook-test.md
cleanup() { rm -f docs/brd/9999-hook-test.md; [ -n "$made_dir" ] && rmdir "$made_dir" 2>/dev/null; }
trap cleanup EXIT

pass=0; fail=0
tab=$(printf '\t')
while IFS="$tab" read -r hook fixture expect note; do
    case "$hook" in ''|'#'*) continue ;; esac
    out=$(sed "s#__ROOT__#$root#g" ".agents/hooks/tests/$fixture" | sh ".agents/hooks/$hook" 2>&1)
    got=$?
    if [ "$got" = "$expect" ]; then
        pass=$((pass + 1))
    else
        fail=$((fail + 1))
        echo "FAIL $hook < $fixture: exit $got, expected $expect ($note)"
        printf '%s\n' "$out" | sed 's/^/    /'
    fi
done < .agents/hooks/tests/cases.tsv

echo "hook tests: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
