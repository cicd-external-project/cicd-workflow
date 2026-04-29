import { mkdirSync, writeFileSync } from "node:fs";

import { health } from "../src/server.js";

if (health().ok !== true) {
  throw new Error("Build validation failed");
}

mkdirSync("dist", { recursive: true });
writeFileSync("dist/server.js", "export const ready = true;\n");
writeFileSync("dist/build-info.json", JSON.stringify({ framework: "nodejs" }, null, 2));

console.log("Build completed");
