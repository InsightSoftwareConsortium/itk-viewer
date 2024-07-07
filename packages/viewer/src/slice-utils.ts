import { ValueOf } from '@itk-viewer/io/types.js';

export const Axis = {
  I: 'I',
  J: 'J',
  K: 'K',
} as const;

export type AxisType = ValueOf<typeof Axis>;
