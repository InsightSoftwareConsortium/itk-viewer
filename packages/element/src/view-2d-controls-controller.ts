import { ReactiveController, ReactiveControllerHost } from 'lit';
import { AxisType, View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { SelectorController } from 'xstate-lit';
import { TransferFunctionEditor } from '@itk-viewer/transfer-function-editor/TransferFunctionEditor.js';

export class View2dControls implements ReactiveController {
  host: ReactiveControllerHost;

  actor: View2dActor | undefined;
  scale: SelectorController<View2dActor, number> | undefined;
  scaleCount: SelectorController<View2dActor, number> | undefined;
  slice: SelectorController<View2dActor, number> | undefined;
  axis: SelectorController<View2dActor, AxisType> | undefined;
  imageDimension: SelectorController<View2dActor, number> | undefined;
  transferFunctionEditor: TransferFunctionEditor | undefined;

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
    this.axis = new SelectorController(
      this.host,
      this.actor,
      (state) => state.context.axis,
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

  onAxis(event: Event) {
    const target = event.target as HTMLInputElement;
    const axis = target.value as AxisType;
    this.actor!.send({
      type: 'setAxis',
      axis,
    });
  }

  onScale(event: Event) {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  }

  setTransferFunctionContainer(container: Element | undefined) {
    if (container) {
      this.transferFunctionEditor = new TransferFunctionEditor(container);

      const colorTransferFunction = (function () {
        const lowColor = [0, 0, 0, 1];
        const highColor = [1, 1, 1, 1];
        const mappingRange = [0, 10] as [number, number];
        return {
          getMappingRange: () => mappingRange,
          getUint8Table: () => new Uint8Array([255, 255, 255, 255]),
          getSize: () => 2,
          getColor: (intensity: number, rgbaOut: Array<number>) => {
            const midway =
              (mappingRange[1] - mappingRange[0]) / 2 + mappingRange[0];
            if (intensity < midway)
              rgbaOut.splice(0, rgbaOut.length, ...lowColor);
            else rgbaOut.splice(0, rgbaOut.length, ...highColor);
          },
        };
      })();
      this.transferFunctionEditor.setColorTransferFunction(
        colorTransferFunction,
      );
      this.transferFunctionEditor.setColorRange([0.2, 0.8]);
      this.transferFunctionEditor.setRange([0, 10]);
      this.transferFunctionEditor.setRangeViewOnly(true);
    }
  }
}
