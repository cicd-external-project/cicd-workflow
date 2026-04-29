import { site } from "./site.js";

export function renderHomePage() {
  return `<main><h1>${site.name}</h1><p>${site.description}</p></main>`;
}
