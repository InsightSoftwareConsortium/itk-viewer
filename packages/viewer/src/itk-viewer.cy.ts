import { Viewer } from "./itk-viewer.js";

describe("Viewer", () => {
  it("constructs", () => {
    expect(new Viewer()).to.be.ok;
  });
});
