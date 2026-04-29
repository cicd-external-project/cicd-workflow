import { mkdirSync, writeFileSync } from "node:fs";

import { createGreeting } from "../src/app.service.js";

const output = createGreeting("api");

if (!output.includes("api")) {
  throw new Error("Build validation failed");
}

mkdirSync("dist", { recursive: true });
writeFileSync("dist/main.js", `export const message = ${JSON.stringify(output)};\n`);
writeFileSync("dist/build-info.json", JSON.stringify({ framework: "nestjs" }, null, 2));

console.log("Build completed");
