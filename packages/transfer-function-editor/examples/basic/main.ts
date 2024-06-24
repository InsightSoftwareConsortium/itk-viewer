import './style.css';
import { TransferFunctionEditor } from '../../lib/TransferFunctionEditor';

declare global {
  // eslint-disable-next-line
  var editor: TransferFunctionEditor;
}

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div id='editorHome'></div>
`;

const editorHome = document.querySelector<HTMLDivElement>('#editorHome');
if (editorHome) {
  const editor = new TransferFunctionEditor(editorHome);
  editor.setPoints([
    [0.1, 0],
    [0.4, 0.8],
    [0.6, 0.2],
    [0.9, 0.8],
  ]);

  editor.setHistogram([0.1, 0.2, 0.2, 0.5, 0.4, 0.1]);

  const colorTransferFunction = (function () {
    const lowColor = [0, 0, 0, 1];
    const highColor = [1, 1, 1, 1];
    const mappingRange = [0, 10] as [number, number];
    return {
      getMappingRange: () => mappingRange,
      getUint8Table: () => new Uint8Array([255, 255, 255, 255]),
      getSize: () => 2,
      getColor: (intensity: number, rgbaOut: Array<number>) => {
        const midway =
          (mappingRange[1] - mappingRange[0]) / 2 + mappingRange[0];
        if (intensity < midway) rgbaOut.splice(0, rgbaOut.length, ...lowColor);
        else rgbaOut.splice(0, rgbaOut.length, ...highColor);
      },
    };
  })();

  editor.setColorTransferFunction(colorTransferFunction);

  editor.setColorRange([0.2, 0.8]);
  editor.setRange([0, 10]);

  setTimeout(() => {
    editor.setRangeViewOnly(true);
  }, 1000);

  setTimeout(() => {
    editor.setRangeViewOnly(false);
  }, 5000);

  globalThis.editor = editor;
}
