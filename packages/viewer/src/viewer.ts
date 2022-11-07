import { ZarrStoreParser } from "itk-viewer-io/ZarrStoreParser.js";
import { Viewport } from "./viewport";

export class Viewer {
  viewports: Viewport[] = [];

  constructor() {
    ZarrStoreParser;
  }

  addViewport(viewport: Viewport) {
    this.viewports.push(viewport);
  }
}
