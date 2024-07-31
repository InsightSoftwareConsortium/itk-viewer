import { assign, setup, Subscription, enqueueActions } from 'xstate';
import { BuiltImage } from '@itk-viewer/io/MultiscaleSpatialImage.js';
import { Camera, ReadonlyPose } from '@itk-viewer/viewer/camera.js';
import { ViewportActor } from '@itk-viewer/viewer/viewport.js';
import { Image, ImageSnapshot } from '@itk-viewer/viewer/image.js';

export type Context = {
  viewport: ViewportActor;
  camera?: Camera;
  builtImage?: BuiltImage;
  imageActor?: Image;
  imageSubscription?: Subscription;
};

export type SetContainerEvent = {
  type: 'setContainer';
  container: HTMLElement | undefined;
};

export const view3dLogic = setup({
  types: {} as {
    input: { viewport: ViewportActor };
    context: Context;
    events:
      | SetContainerEvent
      | { type: 'setResolution'; resolution: [number, number] }
      | { type: 'imageBuilt'; image: BuiltImage }
      | { type: 'setImageActor'; image: Image }
      | { type: 'imageSnapshot'; state: ImageSnapshot }
      | { type: 'setSlice'; slice: number }
      | { type: 'setCameraPose'; pose: ReadonlyPose }
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
      },
    ) => {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    imageSnapshot: (_, __: ImageSnapshot) => {
      throw new Error('Function not implemented.');
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyCameraPose: (_, __: { pose: ReadonlyPose }) => {
      throw new Error('Function not implemented.');
    },
    forwardResolution: (
      _,
      {
        viewport,
        resolution,
      }: { viewport: ViewportActor; resolution: [number, number] },
    ) => {
      viewport.send({ type: 'setResolution', resolution });
    },
  },
}).createMachine({
  context: ({ input: { viewport } }) => {
    return {
      camera: undefined,
      viewport,
    };
  },
  id: 'view3dVtkjs',
  initial: 'active',
  states: {
    active: {
      on: {
        setContainer: {
          actions: [
            { type: 'setContainer' },
            enqueueActions(({ context, enqueue, self }) => {
              const { builtImage: image } = context;
              if (image) {
                enqueue({
                  type: 'applyBuiltImage',
                  params: { image },
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
          actions: [
            {
              type: 'forwardResolution',
              params: ({ event: { resolution }, context: { viewport } }) => ({
                viewport,
                resolution,
              }),
            },
          ],
        },
        imageBuilt: {
          actions: [
            assign({
              builtImage: ({ event }) => event.image,
            }),
            {
              type: 'applyBuiltImage',
              params: ({ context: { builtImage, camera } }) => ({
                image: builtImage!,
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
              params: ({ event }) => ({ pose: event.pose }),
            },
          ],
        },
      },
    },
  },
});
