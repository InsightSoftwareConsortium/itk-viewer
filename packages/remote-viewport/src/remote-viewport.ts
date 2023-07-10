import { createViewport as parentCreateViewport } from '@itk-viewer/viewer/viewport.js';

export const createViewport = ({
  parent,
  address,
}: {
  parent: HTMLElement;
  address: string;
}) => {
  parent.innerHTML = `<div>Remote viewport at ${address}</div>`;

  return parentCreateViewport();
};
