import { Dimension, Direction } from './types.js';

export type ScaleTransform = {
  type: 'scale';
  scale: number[];
};

export type TranslationTransform = {
  type: 'translation';
  translation: number[];
};

export type NgffTransform = ScaleTransform | TranslationTransform;

export type Dataset = {
  path: string;
  coordinateTransformations?: Array<NgffTransform>;
};

export type DatasetWithTransformation = {
  path: string;
  coordinateTransformations: Array<NgffTransform>;
};

export type ZArray = {
  shape: Array<number>;
  chunks: Array<number>;
  dtype: string;
};

export type DatasetZattrs = {
  _ARRAY_DIMENSIONS?: Array<Dimension>;
  ranges?: Array<Array<number>>;
  direction?: Direction;
};
