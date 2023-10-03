import { IntTypes, FloatTypes } from 'itk-wasm';
import { TypedArrayConstructor, ValueOf } from './types.js';

type componentType = ValueOf<typeof IntTypes> | ValueOf<typeof FloatTypes>;

export const componentTypeToTypedArray = new Map<
  componentType,
  TypedArrayConstructor
>([
  [IntTypes.Int8, Int8Array],
  [IntTypes.UInt8, Uint8Array],
  [IntTypes.Int16, Int16Array],
  [IntTypes.UInt16, Uint16Array],
  [IntTypes.Int32, Int32Array],
  [IntTypes.UInt32, Uint32Array],
  [FloatTypes.Float32, Float32Array],
  [FloatTypes.Float64, Float64Array],
]);
