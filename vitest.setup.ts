import 'vitest-canvas-mock'
import * as ResizeObserverModule from 'resize-observer-polyfill'
;(global as any).ResizeObserver = ResizeObserverModule.default
