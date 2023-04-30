import { Viewport } from './viewport.js';

export class Viewer {
  viewports: Viewport[] = [];

  addViewport(viewport: Viewport) {
    this.viewports.push(viewport);
  }
}
