import 'vitest-canvas-mock';
import * as ResizeObserverModule from 'resize-observer-polyfill';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ResizeObserver = ResizeObserverModule.default;
