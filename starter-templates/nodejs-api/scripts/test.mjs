import assert from "node:assert/strict";

import { health } from "../src/server.js";

assert.equal(health().ok, true);

console.log("Tests passed");
