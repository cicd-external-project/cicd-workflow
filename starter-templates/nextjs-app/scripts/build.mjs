import { mkdirSync, writeFileSync } from "node:fs";

import { renderHomePage } from "../src/app/page.js";

const html = renderHomePage();

if (!html.includes("CI/CD starter")) {
  throw new Error("Home page render did not include expected content");
}

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
writeFileSync("dist/build-info.json", JSON.stringify({ framework: "nextjs" }, null, 2));

console.log("Build completed");
