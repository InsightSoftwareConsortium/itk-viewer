import { ReactiveController, ReactiveControllerHost } from 'lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { SelectorController } from 'xstate-lit';

export class View2dControls implements ReactiveController {
  host: ReactiveControllerHost;

  actor: View2dActor | undefined;
  scale: SelectorController<View2dActor, number> | undefined;
  scaleCount: SelectorController<View2dActor, number> | undefined;
  slice: SelectorController<View2dActor, number> | undefined;
  imageDimension: SelectorController<View2dActor, number> | undefined;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    // no-op
  }

  setActor(actor: View2dActor) {
    this.actor = actor;

    this.scale = new SelectorController(
      this.host,
      this.actor,
      (state) => state.context.scale,
    );
    this.scaleCount = new SelectorController(this.host, this.actor, (state) => {
      const image = state.context.image;
      if (!image) return 1;
      return image.coarsestScale + 1;
    });
    this.slice = new SelectorController(
      this.host,
      this.actor,
      (state) => state.context.slice,
    );
    this.imageDimension = new SelectorController(
      this.host,
      this.actor,
      (state) => state.context.image?.imageType.dimension ?? 0,
    );
    this.host.requestUpdate(); // trigger render with selected state
  }

  onSlice(event: Event) {
    const target = event.target as HTMLInputElement;
    const slice = Number(target.value);
    this.actor!.send({
      type: 'setSlice',
      slice,
    });
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }
}
