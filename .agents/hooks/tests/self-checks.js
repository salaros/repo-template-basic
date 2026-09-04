// .agents/hooks/tests/self-checks.js
// Invariants that don't fit cases.tsv's "run a script against a fixture, check exit code and
// output" shape: each function below gets a `t` (one method, t.ok(condition, title, detail)) and
// the env test.js runs fixtures with (HOOK_TEST set, the harness project-dir variables cleared).
// Run by test.js after the fixture table. Add a new invariant as a new function in the exported
// array, not a fourth inline block in test.js.
const fs = require("fs");
const os = require("os");
const path = require("path");
const lib = require("../lib");
const docsCheck = require("../../../scripts/docs-check");

// The skill roster must be consistent: every skill routed by an agent, README's table current.
function rosterIsConsistent(t) {
    const r = lib.node(["scripts/skills.js", "check"]);
    t.ok(r.status === 0, "node scripts/skills.js check", r.output);
}

// docs-check's citation logic, exercised directly against a throwaway doc tree (real stage folder
// names, so it uses the real AGENTS.md chain) rather than through a fixture: a duplicate document
// number, a citation to an item that does not exist in its target, and a citation that jumps
// forward in the chain. A unique OS-temp directory, not a fixed path under the repo, so two runs
// (a manual one and one the edit hook triggers) can never collide on the same files.
function docsCheckCitationEdgeCases(t) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "harness-docs-check-"));
    const write = (rel, ...lines) => {
        const file = path.join(tmp, rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, lines.join("\n") + "\n");
    };
    write("brd/9001-alpha.md", "# BRD-9001: Alpha");
    write("brd/9001-beta.md", "# BRD-9001: Beta");
    write("brd/9002-source.md", "# BRD-9002: Source", "", "- BR-1: Something real");
    write("prd/9002-citer.md", "# PRD-9002: Citer", "", "**Derived from:** BRD-9002", "", "Refines BRD-9002/BR-2, which does not exist.");
    write("brd/9003-support.md", "# BRD-9003: Support");
    write("ears/9003-late.md", "# EARS-9003: Late");
    write("prd/9003-early.md", "# PRD-9003: Early", "", "**Derived from:** BRD-9003", "", "See EARS-9003 for details.");
    const { problems } = docsCheck.check(tmp, "AGENTS.md");
    fs.rmSync(tmp, { recursive: true, force: true });
    const has = needle => problems.some(p => p.includes(needle));
    const detail = problems.join("\n") || "(none)";
    t.ok(has("already used by"), "docs-check: duplicate document number", detail);
    t.ok(has("has no item BR-2"), "docs-check: citation to a missing item", detail);
    t.ok(has("later in the chain"), "docs-check: citation later in the chain", detail);
}

// A throwaway doc tree: real stage folder names, so check() uses the real AGENTS.md chain, and a
// unique OS-temp directory so two runs (a manual one and one the edit hook triggers) never collide.
// Returns { write, run, clean }; run() gives back a helper that filters problems by file.
function docTree() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "harness-docs-check-"));
    return {
        dir,
        write(rel, ...lines) {
            const file = path.join(dir, rel);
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, lines.join("\n") + "\n");
        },
        run(memoryFile) {
            const { problems } = docsCheck.check(dir, "AGENTS.md", memoryFile || path.join(dir, "no-memory-here.md"));
            return {
                all: problems.join("\n") || "(none)",
                for: rel => problems.filter(p => p.startsWith(path.join(dir, rel).split(path.sep).join("/"))),
            };
        },
        clean: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
}

// Every document says where it came from. Where the chain holds nothing earlier that is a source:
// a URL, an existing repo-relative path, or a Jira key. A missing line, a line naming nothing, and
// a path that does not exist are each their own message.
function docsCheckDerivedFromShapes(t) {
    const tree = docTree();
    tree.write("brd/9100-url.md", "# BRD-9100: Url", "", "**Derived from:** https://example.com/brief");
    tree.write("brd/9101-jira.md", "# BRD-9101: Jira", "", "**Derived from:** jira:ABC-123");
    tree.write("brd/9102-path.md", "# BRD-9102: Path", "", "**Derived from:** .scratch/README.md");
    tree.write("brd/9103-absent.md", "# BRD-9103: Absent");
    tree.write("brd/9104-words.md", "# BRD-9104: Words", "", "**Derived from:** the whiteboard");
    tree.write("brd/9105-gone.md", "# BRD-9105: Gone", "", "**Derived from:** docs/nowhere/missing.md");
    const r = tree.run();
    tree.clean();
    for (const ok of ["brd/9100-url.md", "brd/9101-jira.md", "brd/9102-path.md"])
        t.ok(r.for(ok).length === 0, `docs-check: ${ok} derives from a valid source`, r.all);
    t.ok(r.for("brd/9103-absent.md").some(p => p.includes("missing a")), "docs-check: no Derived from line at all", r.all);
    t.ok(r.for("brd/9104-words.md").some(p => p.includes("names no reference")), "docs-check: Derived from names nothing", r.all);
    t.ok(r.for("brd/9105-gone.md").some(p => p.includes("does not exist")), "docs-check: Derived from names a path that is not there", r.all);
}

// A source stands in for an upstream document only while nothing earlier exists. Once it does, the
// line must cite it — except on an ADR, which is cross-cutting and cites in either direction.
function docsCheckSourceAndAdrExemption(t) {
    const tree = docTree();
    tree.write("brd/9200-real.md", "# BRD-9200: Real", "", "**Derived from:** https://example.com/brief");
    tree.write("prd/9200-stale.md", "# PRD-9200: Stale", "", "**Derived from:** https://example.com/brief");
    tree.write("adr/9200-forced.md", "# ADR-9200: Forced", "", "**Derived from:** https://example.com/rfc");
    tree.write("spec/9200-design.md", "# SPEC-9200: Design", "", "**Derived from:** BRD-9200");
    tree.write("adr/9201-late.md", "# ADR-9201: Late", "", "**Derived from:** SPEC-9200");
    tree.write("prd/9201-decided.md", "# PRD-9201: Decided", "", "**Derived from:** BRD-9200", "", "Constrained by ADR-9200.");
    const r = tree.run();
    tree.clean();
    t.ok(r.for("prd/9200-stale.md").some(p => p.includes("cite the upstream document instead")),
        "docs-check: source-only line once an upstream document exists", r.all);
    t.ok(r.for("adr/9200-forced.md").length === 0, "docs-check: an ADR may derive from a source at any time", r.all);
    t.ok(r.for("adr/9201-late.md").length === 0, "docs-check: an ADR may cite a later stage", r.all);
    t.ok(r.for("prd/9201-decided.md").length === 0, "docs-check: any document may cite an ADR", r.all);
}

// MEMORY.md's Requirements takes part in traceability, so it follows the same reference rule.
function docsCheckMemoryRequirements(t) {
    const tree = docTree();
    tree.write("brd/9300-real.md", "# BRD-9300: Real", "", "**Derived from:** https://example.com/brief");
    const memory = (name, ...lines) => {
        const file = path.join(tree.dir, name);
        fs.writeFileSync(file, lines.join("\n") + "\n");
        const { problems } = docsCheck.check(tree.dir, "AGENTS.md", file);
        return problems.filter(p => p.startsWith(file.split(path.sep).join("/")) || p.startsWith(file));
    };
    const cases = [
        ["none yet", ["# Project", "", "- **Requirements:** none yet"], 0, ""],
        ["a document that exists", ["- **Requirements:** BRD-9300"], 0, ""],
        ["several sources", ["- **Requirements:** https://example.com/a, jira:ABC-1"], 0, ""],
        ["a document that does not exist", ["- **Requirements:** BRD-9999"], 1, "does not exist"],
        ["prose instead of a reference", ["- **Requirements:** the whiteboard"], 1, "is not a document ID"],
        ["no Requirements line", ["# Project", "", "- **Stack:** none yet"], 1, "no Requirements line"],
    ];
    for (const [title, lines, want, needle] of cases) {
        const problems = memory("memory.md", ...lines);
        const detail = problems.join("\n") || "(none)";
        t.ok(want === 0 ? problems.length === 0 : problems.some(p => p.includes(needle)),
            `docs-check: MEMORY.md Requirements, ${title}`, detail);
    }
    tree.clean();
}

// root() must actually follow a harness's project-dir variable, not just fall back to this
// checkout — the one branch no TSV fixture exercises, since they all run with these variables
// cleared. Points CLAUDE_PROJECT_DIR at an unrelated directory with its own MEMORY.md and checks
// that session-start.js reports on THAT directory.
function sessionStartFollowsProjectDir(t, env) {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), "harness-root-test-"));
    fs.writeFileSync(path.join(other, "MEMORY.md"), "# Project memory\n");
    const r = lib.node([".agents/hooks/session-start.js"], { env: { ...env, CLAUDE_PROJECT_DIR: other } });
    fs.rmSync(other, { recursive: true, force: true });
    t.ok(r.status === 0 && r.output.includes("facts in MEMORY.md") && !r.output.includes("not initialised"),
        "session-start.js follows CLAUDE_PROJECT_DIR", r.output);
}

// The stage table in AGENTS.md has one parser, readChain(), and anything that needs the pipeline
// builds on it rather than reading the table again. Pin what it promises those callers: every row
// in table order, document stages carrying the folder their name implies.
const PIPELINE = ["BRD", "PRD", "EARS", "BDD", "ADR", "SPEC"];
function chainIsParsedInPipelineOrder(t) {
    const { stages, problems } = docsCheck.readChain();
    const named = stages.map(s => s.stage);
    const detail = named.join(",");
    t.ok(problems.length === 0, "readChain finds no problem in this repo's table", problems.join("\n"));
    const order = PIPELINE.map(s => named.indexOf(s));
    t.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])), "readChain returns the stages in pipeline order", detail);
    t.ok(stages.some(s => !s.folder), "readChain returns the stages that are not documents too", detail);
    const wrong = stages.filter(s => s.folder && s.folder !== s.stage.toLowerCase());
    t.ok(!wrong.length, "every document stage's folder matches its name", wrong.map(s => `${s.stage} -> ${s.lives}`).join(","));
}

// tools/docs-site is optional: a repo that publishes straight to Jira can delete the folder and owes
// this suite nothing, so the portal's end-to-end smoke runs only when it is installed. It needs no
// Astro install of its own, since chain.mjs only reads.
function docsSiteRendersTheChain(t) {
    const entry = path.join("tools", "docs-site", "chain.mjs");
    if (!fs.existsSync(entry)) { console.log("skip tools/docs-site smoke: the optional portal is not installed"); return; }
    const r = lib.node([entry]);
    t.ok(r.status === 0, "tools/docs-site/chain.mjs runs", r.output);
    if (r.status !== 0) return;
    const order = PIPELINE.map(s => r.output.indexOf(`${s}\t`));
    t.ok(order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])),
        "docs-site reads the stages in pipeline order", r.output);
}

module.exports = [
    rosterIsConsistent,
    docsCheckCitationEdgeCases,
    docsCheckDerivedFromShapes,
    docsCheckSourceAndAdrExemption,
    docsCheckMemoryRequirements,
    chainIsParsedInPipelineOrder,
    docsSiteRendersTheChain,
    sessionStartFollowsProjectDir,
];
