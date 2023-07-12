import { createViewport as parentCreateViewport } from '@itk-viewer/viewer/viewport.js';

export const createViewport = ({ address }: { address: string }) => {
  const element = document.createElement('div');
  element.innerHTML = `Remote viewport at ${address}`;

  return { actor: parentCreateViewport(), element };
};
