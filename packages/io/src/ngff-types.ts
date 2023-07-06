import { Transform } from './ngff-validator.js';

export type Dataset = {
  path: string;
  coordinateTransformations?: Array<Transform>;
};

export type DatasetWithTransformation = {
  path: string;
  coordinateTransformations: Array<Transform>;
};
