import { z } from 'zod';

export const IMAGE_VERSION_DEFAULT = '0.4';

const direction = z.array(z.array(z.number()).length(3)).length(3);
const ranges = z.array(z.array(z.number()).length(2));

const dimension = z.enum(['x', 'y', 'z', 'c', 't']);

export type Dimension = z.infer<typeof dimension>;

const axis = z.object({
  name: dimension,
  type: z.enum(['channel', 'time', 'space']).optional(),
});

export type Axis = z.infer<typeof axis>;

const customNgffProperties = {
  direction: direction.optional(),
  ranges: ranges.optional(),
};

const coordinateTransformations = z
  .array(
    z.union([
      z.object({
        type: z.enum(['scale']),
        scale: z.array(z.number()).min(2),
      }),
      z.object({
        type: z.enum(['translation']),
        translation: z.array(z.number()).min(2),
      }),
    ])
  )
  .min(1);

export const image = {
  '0.4': z
    .object({
      multiscales: z
        .array(
          z.object({
            name: z.string().optional(),
            datasets: z
              .array(
                z.object({
                  path: z.string(),
                  coordinateTransformations: coordinateTransformations,
                })
              )
              .min(1),
            version: z.enum(['0.4']).optional(),
            axes: z.array(axis).min(2).max(5),
            coordinateTransformations: coordinateTransformations.optional(),
            ...customNgffProperties,
          })
        )
        .min(1)
        .describe('The multiscale datasets for this image'),
      omero: z
        .object({
          channels: z.array(
            z.object({
              window: z.object({
                end: z.number(),
                max: z.number(),
                min: z.number(),
                start: z.number(),
              }),
              label: z.string().optional(),
              family: z.string().optional(),
              color: z.string(),
              active: z.boolean().optional(),
            })
          ),
        })
        .optional(),
    })
    .describe('JSON from OME-NGFF .zattrs'),
  '0.1': z
    .object({
      multiscales: z
        .array(
          z.object({
            name: z.string().optional(),
            datasets: z.array(z.object({ path: z.string() })).min(1),
            version: z.enum(['0.1']).optional(),
            metadata: z
              .object({
                method: z.string().optional(),
                version: z.string().optional(),
              })
              .optional(),
            ...customNgffProperties,
          })
        )
        .min(1)
        .describe('The multiscale datasets for this image'),
      omero: z
        .object({
          channels: z.array(
            z.object({
              window: z.object({
                end: z.number(),
                max: z.number().optional(), // optional looser than spec
                min: z.number().optional(), // optional looser than spec
                start: z.number(),
              }),
              label: z.string().optional(),
              family: z.string().optional(),
              color: z.string(),
              active: z.boolean().optional(),
            })
          ),
        })
        .optional(),
    })
    .describe('JSON from OME-NGFF .zattrs'),
};

type Schema = z.infer<(typeof image)['0.1'] | (typeof image)['0.4']>;

export type NgffImage = Schema['multiscales'][number];
