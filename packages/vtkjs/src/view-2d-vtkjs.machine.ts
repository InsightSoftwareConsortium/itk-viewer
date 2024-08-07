import {
  AnyActorRef,
  ActorRefFrom,
  Subscription,
  assign,
  enqueueActions,
  sendTo,
  setup,
} from 'xstate';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Camera, Pose } from '@itk-viewer/viewer/camera.js';
import { Axis, AxisType } from '@itk-viewer/viewer/slice-utils.js';
import { Image, ImageSnapshot } from '@itk-viewer/viewer/image.js';

import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps';

export type Context = {
  camera: Camera | undefined;
  parent: AnyActorRef;
  axis: AxisType;
  builtImage?: BuiltImage;
  sliceIndex?: number;
  imageActor?: Image;
  imageSubscription?: Subscription;
  colorMapOptions: string[];
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const view2dLogic = setup({
  types: {} as {
    input: { parent: AnyActorRef };
    context: Context;
    events:
      | SetContainerEvent
      | { type: 'setResolution'; resolution: [number, number] }
      | { type: 'imageBuilt'; image: BuiltImage; sliceIndex: number }
      | { type: 'setImageActor'; image: Image }
      | { type: 'imageSnapshot'; state: ImageSnapshot }
      | { type: 'setAxis'; axis: AxisType }
      | { type: 'setCameraPose'; pose: Pose; parallelScaleRatio: number }
      | { type: 'setCamera'; camera: Camera };
  },
  actions: {
    setContainer: () => {
      throw new Error('Function not implemented.');
    },
    applyBuiltImage: (
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      __: {
        image: BuiltImage;
        sliceIndex: number;
      },
    ) => {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyCameraPose: (_, __: { pose: Pose; parallelScaleRatio: number }) => {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyAxis: (_, __: { axis: AxisType }) => {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    imageSnapshot: (_, __: ImageSnapshot) => {
      throw new Error('Function not implemented.');
    },
    forwardToParent: sendTo(
      ({ context }) => context.parent,
      ({ event }) => {
        return event;
      },
    ),
  },
}).createMachine({
  context: ({ input: { parent } }) => {
    return {
      camera: undefined,
      axis: Axis.K,
      parent,
      colorMapOptions: vtkColorMaps.rgbPresetNames,
    };
  },
  id: 'view2dVtkjs',
  initial: 'active',
  states: {
    active: {
      on: {
        setContainer: {
          actions: [
            { type: 'setContainer' },
            {
              type: 'applyAxis',
              params: ({ context: { axis } }) => ({
                axis,
              }),
            },
            enqueueActions(({ context, enqueue, self }) => {
              const { builtImage: image, sliceIndex } = context;
              if (image && sliceIndex !== undefined) {
                enqueue({
                  type: 'applyBuiltImage',
                  params: { image, sliceIndex },
                });
              }
              if (context.imageActor) {
                enqueue({
                  type: 'imageSnapshot',
                  params: context.imageActor.getSnapshot(),
                });
              }
              if (context.camera) {
                // get latest camera params
                self.send({
                  type: 'setCamera',
                  camera: context.camera,
                });
              }
            }),
          ],
        },
        setResolution: {
          actions: ['forwardToParent'],
        },
        imageBuilt: {
          actions: [
            assign({
              builtImage: ({ event }) => event.image,
              sliceIndex: ({ event }) => event.sliceIndex,
            }),
            {
              type: 'applyBuiltImage',
              params: ({ context: { builtImage, sliceIndex, camera } }) => ({
                image: builtImage!,
                sliceIndex: sliceIndex!,
                cameraPose: camera?.getSnapshot().context.pose,
              }),
            },
          ],
        },
        setImageActor: {
          actions: [
            ({ context }) => {
              context.imageSubscription?.unsubscribe();
            },
            assign({
              imageActor: ({ event: { image } }) => image,
            }),
            assign({
              imageSubscription: ({ context: { imageActor }, self }) =>
                imageActor!.subscribe((state) =>
                  self.send({ type: 'imageSnapshot', state }),
                ),
            }),
          ],
        },
        imageSnapshot: {
          actions: [
            { type: 'imageSnapshot', params: ({ event }) => event.state },
          ],
        },
        setCamera: {
          actions: [
            ({ context, self }) => {
              context.camera?.send({ type: 'watchPoseStop', watcher: self });
            },
            assign({
              camera: ({ event: { camera } }) => camera,
            }),
            ({ event, self }) => {
              event.camera.send({ type: 'watchPose', watcher: self });
            },
          ],
        },
        setCameraPose: {
          actions: [
            {
              type: 'applyCameraPose',
              params: ({ event }) => ({
                pose: event.pose,
                parallelScaleRatio: event.parallelScaleRatio,
              }),
            },
          ],
        },
        setAxis: {
          actions: [
            assign({
              axis: ({ event }) => event.axis,
            }),
            {
              type: 'applyAxis',
              params: ({ event }) => ({
                axis: event.axis,
              }),
            },
          ],
        },
      },
    },
  },
});

export type View2dVtkjs = ActorRefFrom<typeof view2dLogic>;
