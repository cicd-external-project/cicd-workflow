import assert from "node:assert/strict";

import { renderHomePage } from "../src/app/page.js";

assert.match(renderHomePage(), /CI\/CD starter/);

console.log("Tests passed");
