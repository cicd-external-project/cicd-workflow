import { readFileSync } from "node:fs";

const requiredFiles = ["src/App.js", "src/main.js", "scripts/test.mjs"];

for (const file of requiredFiles) {
  const content = readFileSync(file, "utf8");
  if (content.includes("\t")) {
    throw new Error(`${file} contains tab indentation`);
  }
}

console.log("Lint passed");
