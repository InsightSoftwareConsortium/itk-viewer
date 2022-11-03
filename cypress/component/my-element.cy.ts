import { html } from "lit";

import "../../src/my-element";

describe("Lit mount", () => {
  it("mounts", () => {
    cy.mount<"my-element">(html`<my-element></my-element>`);
    cy.get("my-element").shadow().contains("count is 0");
  });
});
