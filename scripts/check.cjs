const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(cjs|js)$/.test(p))
      execFileSync(process.execPath, ["--check", p], { stdio: "inherit" });
  }
}
walk("app");
walk("scripts");
walk("tests");
console.log("JavaScript syntax checks passed");
