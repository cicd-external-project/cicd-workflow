import assert from "node:assert/strict";

import { renderApp } from "../src/App.js";

assert.match(renderApp(), /React starter/);

console.log("Tests passed");
