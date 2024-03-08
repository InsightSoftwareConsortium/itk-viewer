import * as Comlink from 'comlink';
import { createRangeHelper } from './createRangeHelper';

const computeRanges = ({
  split,
  numberOfSplits,
  values,
  numberOfComponents,
}) => {
  const helpers = [...Array(numberOfComponents)].map(createRangeHelper);

  const start = Math.floor(values.length / numberOfSplits) * split;
  const end =
    split === numberOfSplits - 1
      ? values.length
      : Math.floor(values.length / numberOfSplits) * (split + 1);

  for (let i = start; i < end; i++) {
    helpers[i % numberOfComponents].add(values[i]);
  }

  return helpers.map((h) => h.getRange());
};

Comlink.expose({
  computeRanges,
});
