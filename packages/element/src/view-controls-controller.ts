import { ReactiveController, ReactiveControllerHost } from 'lit';
import { AnyActorRef, Subscription } from 'xstate';
import { SelectorController } from 'xstate-lit';
import { View2dActor } from '@itk-viewer/viewer/view-2d.js';
import { View3dActor } from '@itk-viewer/viewer/view-3d.js';
import { AxisType } from '@itk-viewer/viewer/slice-utils.js';
import { TransferFunctionEditor } from '@itk-viewer/transfer-function-editor/TransferFunctionEditor.js';
import { ColorTransferFunction } from '@itk-viewer/transfer-function-editor/ColorTransferFunction.js';
import { Image, ImageSnapshot } from '@itk-viewer/viewer/image.js';
import { View2dVtkjs } from '@itk-viewer/vtkjs/view-2d-vtkjs.machine.js';
import { View3dVtkjs } from '@itk-viewer/vtkjs/view-3d-vtkjs.machine.js';

export type ViewActor = View2dActor | View3dActor;
export type RenderingActor = View3dVtkjs | View2dVtkjs;

type ViewSnapshot = ReturnType<ViewActor['getSnapshot']>;

const equalFloats = (a: number, b: number) => Math.abs(a - b) < 1e-6;

export class ViewControls implements ReactiveController {
  host: ReactiveControllerHost;

  actor: ViewActor | undefined;
  viewSubscription: Subscription | undefined;
  imageSubscription: Subscription | undefined;
  imageActor: Image | undefined;
  renderer: RenderingActor | undefined;
  rendererSubscription: Subscription | undefined;

  scale: SelectorController<View2dActor, number> | undefined;
  scaleCount: SelectorController<View2dActor, number> | undefined;
  slice: SelectorController<View2dActor, number> | undefined;
  axis: SelectorController<View2dActor, AxisType> | undefined;
  imageDimension: SelectorController<View2dActor, number> | undefined;
  colorMapsOptions:
    | SelectorController<RenderingActor, Record<string, string>>
    | undefined;
  colorMaps: SelectorController<Image, string[]> | undefined;
  componentCount: SelectorController<Image, number> | undefined;

  selectedComponent = 0;

  transferFunctionEditor: TransferFunctionEditor | undefined;
  view: '2d' | '3d' = '2d';
  colorTransferFunctions = new Map<number, ColorTransferFunction>(); // component -> colorTransferFunction

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    // no-op
  }

  setActor(actor: ViewActor) {
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
    this.host.requestUpdate(); // trigger render with selected state

    // wire up Transfer Function Editor
    if (this.viewSubscription) this.viewSubscription.unsubscribe();
    this.viewSubscription = (this.actor as AnyActorRef).subscribe(
      this.onViewSnapshot.bind(this),
    );
    this.onViewSnapshot(this.actor.getSnapshot());
  }

  onSlice = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const slice = Number(target.value);
    (this.actor as AnyActorRef).send({
      type: 'setSlice',
      slice,
    });
  };

  onAxis = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const axis = target.value as AxisType;
    (this.actor as AnyActorRef).send({
      type: 'setAxis',
      axis,
    });
  };

  onScale = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const scale = Number(target.value);
    this.actor!.send({ type: 'setScale', scale });
  };

  onSelectedComponent = (component: number) => {
    this.selectedComponent = component;
    this.updateTransferFunctionEditor();
  };

  onColorMap = (colorMap: string) => {
    this.imageActor?.send({
      type: 'colorMap',
      component: this.selectedComponent,
      colorMap,
    });
  };

  setTransferFunctionContainer = (container: Element | undefined) => {
    if (container) {
      this.transferFunctionEditor = new TransferFunctionEditor(container);

      this.transferFunctionEditor.setColorTransferFunction(
        new ColorTransferFunction(),
      );
      this.updateTransferFunctionEditor();

      this.transferFunctionEditor.eventTarget.addEventListener(
        'colorRange',
        (e) => {
          const range = (<CustomEvent>e).detail as [number, number];
          this.imageActor?.send({
            type: 'normalizedColorRange',
            range,
            component: this.selectedComponent,
          });
        },
      );

      this.transferFunctionEditor.eventTarget.addEventListener(
        'updated',
        (e) => {
          const points = (<CustomEvent>e).detail as [number, number][];
          this.imageActor?.send({
            type: 'normalizedOpacityPoints',
            points,
            component: this.selectedComponent,
          });
        },
      );
    } else {
      this.transferFunctionEditor?.remove();
      this.transferFunctionEditor = undefined;
    }
  };

  onViewSnapshot = (snapshot: ViewSnapshot) => {
    const { imageActor, spawned } = snapshot.context;
    if (this.imageActor !== imageActor) {
      this.imageSubscription?.unsubscribe();
      this.imageSubscription = undefined;
    }
    this.imageActor = imageActor;
    // If imageActor exists and there's no subscription, subscribe to it.
    if (this.imageActor && !this.imageSubscription) {
      this.imageSubscription = this.imageActor.subscribe(
        this.onImageActorSnapshot.bind(this),
      );
      this.onImageActorSnapshot(this.imageActor.getSnapshot());

      this.imageDimension = new SelectorController(
        this.host,
        this.imageActor,
        (state) => state.context.image?.imageType.dimension ?? 0,
      );
      this.colorMaps = new SelectorController(
        this.host,
        this.imageActor,
        (state) => state.context.colorMaps,
      );
      this.componentCount = new SelectorController(
        this.host,
        this.imageActor,
        (state) => state.context.image?.imageType.components ?? 1,
      );
    }

    const renderer = Object.values(spawned)?.[0];
    if (this.renderer !== renderer) {
      this.rendererSubscription?.unsubscribe();
      this.rendererSubscription = undefined;
    }
    this.renderer = renderer;
    if (this.renderer && !this.rendererSubscription) {
      this.colorMapsOptions = new SelectorController(
        this.host,
        renderer,
        (state) => state.context.colorMapOptions ?? {},
      );
      this.rendererSubscription = renderer.on(
        'colorTransferFunctionApplied',
        this.onColorTransferFunction,
      );
    }
  };

  onImageActorSnapshot = (snapshot: ImageSnapshot) => {
    if (!this.transferFunctionEditor) return;
    const component = this.selectedComponent;
    const { dataRanges, normalizedColorRanges, normalizedOpacityPoints } =
      snapshot.context;
    const componentRange = dataRanges[component];
    if (componentRange) {
      this.transferFunctionEditor.setRange(componentRange);
    }

    if (normalizedColorRanges.length === 0) return;
    const currentColorRange = this.transferFunctionEditor.getColorRange();
    // avoid infinite loop
    const colorRange = normalizedColorRanges[component];
    const changed = currentColorRange?.some(
      (v, i) => !equalFloats(v, colorRange[i]),
    );
    if (changed) {
      this.transferFunctionEditor.setColorRange(colorRange);
    }

    const currentPoints = this.transferFunctionEditor.getPoints();
    const opacityPoints = normalizedOpacityPoints[component];
    const pointsChanged = currentPoints?.some(
      (point, i) =>
        !equalFloats(point[0], opacityPoints[i][0]) ||
        !equalFloats(point[1], opacityPoints[i][1]),
    );
    if (pointsChanged) {
      this.transferFunctionEditor.setPoints(opacityPoints);
    }

    this.updateColorTransferFunction();
  };

  setView = (view: '2d' | '3d') => {
    this.view = view;
    this.updateTransferFunctionEditor();
  };

  updateTransferFunctionEditor = () => {
    const rangeViewOnly = this.view === '2d';
    this.transferFunctionEditor?.setRangeViewOnly(rangeViewOnly);

    if (this.imageActor) {
      this.onImageActorSnapshot(this.imageActor.getSnapshot());
    }
  };

  updateColorTransferFunction = () => {
    const ct = this.colorTransferFunctions.get(this.selectedComponent);
    if (!ct) return;
    this.transferFunctionEditor?.setColorTransferFunction(ct);
  };

  onColorTransferFunction = ({
    colorTransferFunction,
    component,
  }: {
    colorTransferFunction: ColorTransferFunction;
    component: number;
  }) => {
    this.colorTransferFunctions.set(component, colorTransferFunction);
    this.updateColorTransferFunction();
  };
}
