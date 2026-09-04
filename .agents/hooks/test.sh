#!/bin/sh
# .agents/hooks/test.sh
# Runs the harness suite. Every line of tests/cases.tsv is six tab-separated columns:
#   <script and args> <fixture> <expected exit> <setup> <expected output> <note>
# The script is relative to the repo root and run with sh; the fixture is piped to it as stdin
# with __ROOT__ replaced by this checkout; setup is "-" or "plant <path> <first line>", a file
# that exists only while that case runs; expected output is "-" or a substring that the combined
# stdout and stderr must contain. Prints one FAIL line per mismatch and exits 1 if any.
# Usage: sh .agents/hooks/test.sh
dir=$(cd -P -- "$(dirname -- "$0")" && pwd)
cd "$dir/../.." || exit 1
root=$(pwd)
export HOOK_TEST=1
unset CLAUDE_PROJECT_DIR CURSOR_PROJECT_DIR GEMINI_PROJECT_DIR

planted=""
plant() { planted=$1; shift; mkdir -p "$(dirname -- "$planted")"; printf '%s\n' "$*" > "$planted"; }
cleanup() { [ -n "$planted" ] && { rm -f "$planted"; rmdir "$(dirname -- "$planted")" 2>/dev/null; planted=""; }; }
trap cleanup EXIT

pass=0; fail=0
tab=$(printf '\t')
while IFS="$tab" read -r script fixture expect setup want note; do
    case "$script" in ''|'#'*) continue ;; esac
    case "$setup" in plant\ *) set -- $setup; shift; plant "$@" ;; esac
    out=$(sed "s#__ROOT__#$root#g" ".agents/hooks/tests/$fixture" | sh $script 2>&1)
    got=$?
    cleanup
    ok=1
    [ "$got" = "$expect" ] || ok=""
    if [ "$want" != "-" ]; then case "$out" in *"$want"*) ;; *) ok="" ;; esac; fi
    if [ -n "$ok" ]; then
        pass=$((pass + 1))
    else
        fail=$((fail + 1))
        echo "FAIL $script < $fixture: exit $got, expected $expect, output must contain \"$want\" ($note)"
        printf '%s\n' "$out" | sed 's/^/    /'
    fi
done < .agents/hooks/tests/cases.tsv

# The roster must be consistent too: every skill routed, README table current.
out=$(node scripts/skills.js check 2>&1)
if [ $? -eq 0 ]; then
    pass=$((pass + 1))
else
    fail=$((fail + 1))
    echo "FAIL node scripts/skills.js check"
    printf '%s\n' "$out" | sed 's/^/    /'
fi

echo "harness tests: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
