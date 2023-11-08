import { createContext } from '@lit/context';
import type { Viewer } from '@itk-viewer/viewer/viewer.js';
export type { Viewer } from '@itk-viewer/viewer/viewer.js';

export const viewerContext = createContext<Viewer>(Symbol('viewer'));
