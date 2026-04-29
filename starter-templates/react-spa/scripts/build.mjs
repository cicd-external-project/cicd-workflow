import { mkdirSync, writeFileSync } from "node:fs";

import { renderApp } from "../src/App.js";

const html = renderApp();

if (!html.includes("React starter")) {
  throw new Error("React starter render did not include expected content");
}

mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", html);
writeFileSync("dist/build-info.json", JSON.stringify({ framework: "react" }, null, 2));

console.log("Build completed");
