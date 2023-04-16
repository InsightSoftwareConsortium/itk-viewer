import { Viewport } from './viewport';

export class Viewer {
  viewports: Viewport[] = [];

  addViewport(viewport: Viewport) {
    this.viewports.push(viewport);
  }
}
