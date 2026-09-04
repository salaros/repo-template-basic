#!/usr/bin/env node
// scripts/githooks-init.js
// Points Git at the committed hooks in .githooks/ (core.hooksPath), so this clone runs them and
// picks up every change to them on pull; nothing is copied. Run once per clone.
// Usage: node scripts/githooks-init.js
const fs = require("fs");
const { spawnSync } = require("child_process");
const lib = require("./lib");

lib.chdirRoot();
const r = spawnSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status === null ? 1 : r.status);
console.log(`Git hooks: core.hooksPath = .githooks (${fs.readdirSync(".githooks").join(" ")})`);
