import assert from "node:assert/strict";

import { createGreeting } from "../src/app.service.js";

assert.equal(createGreeting("api"), "Hello from api");

console.log("Tests passed");
