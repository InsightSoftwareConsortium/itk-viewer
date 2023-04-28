export const imageInfoViewport = (mount: HTMLElement) => {
  const imageInfoViewport = document.createElement('div');
  imageInfoViewport.setAttribute('id', 'imageInfoViewport');
  imageInfoViewport.setAttribute('style', 'height: 100%;');
  mount.appendChild(imageInfoViewport);
};
