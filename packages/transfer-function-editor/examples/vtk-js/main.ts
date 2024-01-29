import './style.css';
import { throttle } from '@kitware/vtk.js/macros';
import {
  TransferFunctionEditor,
  getNodes,
} from '../../lib/TransferFunctionEditor';
import { Point } from '../../lib/Point';

const UPDATE_TF_DELAY = 50;
const DATA_RANGE = [0, 255];

declare global {
  // eslint-disable-next-line
  var renderWindow: any, ofun: any, ctfun: any;
}

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div>
    <h3>Transfer Function</h3>
    <p>Click on empty space to drop a point.  Click a point without dragging to delete.</p>
    <div id='editorHome'></div>
  </div>
`;

const opacityFunction = globalThis.ofun;
const colorFunction = globalThis.ctfun;
const editorHome = document.querySelector<HTMLDivElement>('#editorHome');
if (editorHome) {
  const editor = new TransferFunctionEditor(editorHome);

  editor.eventTarget.addEventListener(
    'updated',
    throttle((e) => {
      const points = (<CustomEvent>e).detail as Point[];
      const arrayPoints = points.map((p) => [p.x, p.y]) as Array<
        [number, number]
      >;
      const nodes = getNodes(DATA_RANGE, arrayPoints);
      opacityFunction.setNodes(nodes);

      globalThis.renderWindow.render();
    }, UPDATE_TF_DELAY),
  );

  editor.eventTarget.addEventListener(
    'colorRange',
    throttle((e) => {
      const delta = DATA_RANGE[1] - DATA_RANGE[0];
      const [start, end] = ((<CustomEvent>e).detail as [number, number]).map(
        (bound) => bound * delta + DATA_RANGE[0],
      );
      if (start === end) return; // vtk.js warns if 0 difference
      colorFunction.setMappingRange(start, end);

      globalThis.renderWindow.render();
    }, UPDATE_TF_DELAY),
  );

  editor.setColorTransferFunction(colorFunction);
  editor.setColorRange([0.25, 0.75]);
  editor.setPoints([
    [0.1, 0.1],
    [0.9, 0.9],
  ]);
  editor.setRange(DATA_RANGE as [number, number]);
}
