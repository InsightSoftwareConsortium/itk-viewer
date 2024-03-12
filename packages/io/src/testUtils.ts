import { Image } from 'itk-wasm';

const SAMPLE_SIZE = 33;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const takeSnapshot = ({ data, metadata, ...rest }: Image) => {
  if (!data) return '';
  const innerOffset = data.length / 2;
  const baseline = {
    ...rest,
    data: [
      ...data.slice(0, SAMPLE_SIZE),
      ...data.slice(innerOffset, innerOffset + SAMPLE_SIZE),
      ...data.slice(-SAMPLE_SIZE),
    ],
  };
  return JSON.stringify(baseline);
};
