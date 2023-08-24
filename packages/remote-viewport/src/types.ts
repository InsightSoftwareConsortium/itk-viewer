export type Image = {
  size: [number, number];
  data: ArrayBuffer;
};

export type RenderedFrame = {
  frame: Image;
  renderTime: number;
};
