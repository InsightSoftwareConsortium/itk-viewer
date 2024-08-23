# @itk-viewer/element

## 0.6.4

### Patch Changes

- d4f0ce0: Fix error when unmounting renderer by calling setContainer(undefined) and imageSnapshot happens.
- Updated dependencies [d4f0ce0]
  - @itk-viewer/transfer-function-editor@1.8.3
  - @itk-viewer/vtkjs@0.4.4

## 0.6.3

### Patch Changes

- 1cf5204: Max height on color map selector.
- Updated dependencies [8d8ccb4]
  - @itk-viewer/transfer-function-editor@1.8.2
  - @itk-viewer/vtkjs@0.4.3

## 0.6.2

### Patch Changes

- e96dbc0: Add color transfer function selection.
- Updated dependencies [e96dbc0]
  - @itk-viewer/transfer-function-editor@1.8.1
  - @itk-viewer/remote-viewport@0.2.20
  - @itk-viewer/viewer@0.6.1
  - @itk-viewer/utils@0.1.4
  - @itk-viewer/vtkjs@0.4.2
  - @itk-viewer/io@0.4.3

## 0.6.1

### Patch Changes

- 8fb3817: Fix VTK.js renderers DOM mount lifecycle.
- Updated dependencies [8fb3817]
  - @itk-viewer/vtkjs@0.4.1

## 0.6.0

### Minor Changes

- dae0e89: Add opacity function editor to View 3D.

### Patch Changes

- Updated dependencies [dae0e89]
  - @itk-viewer/transfer-function-editor@1.8.0
  - @itk-viewer/viewer@0.6.0
  - @itk-viewer/vtkjs@0.4.0
  - @itk-viewer/remote-viewport@0.2.19

## 0.5.3

### Patch Changes

- @itk-viewer/io@0.4.2
- @itk-viewer/remote-viewport@0.2.18
- @itk-viewer/viewer@0.5.3
- @itk-viewer/vtkjs@0.3.3

## 0.5.2

### Patch Changes

- @itk-viewer/io@0.4.1
- @itk-viewer/remote-viewport@0.2.17
- @itk-viewer/viewer@0.5.2
- @itk-viewer/vtkjs@0.3.2

## 0.5.1

### Patch Changes

- Updated dependencies [0871fbb]
  - @itk-viewer/io@0.4.0
  - @itk-viewer/remote-viewport@0.2.16
  - @itk-viewer/viewer@0.5.1
  - @itk-viewer/vtkjs@0.3.1

## 0.5.0

### Minor Changes

- ac23fbc: 2D-View: Add color range slider using Transfer Function Editor

### Patch Changes

- Updated dependencies [ac23fbc]
  - @itk-viewer/transfer-function-editor@1.7.0
  - @itk-viewer/viewer@0.5.0
  - @itk-viewer/vtkjs@0.3.0
  - @itk-viewer/io@0.3.0
  - @itk-viewer/remote-viewport@0.2.15

## 0.4.0

### Minor Changes

- ff46215: Add slice axis GUI controls for View 2D

### Patch Changes

- Updated dependencies [99d78de]
- Updated dependencies [ff46215]
  - @itk-viewer/viewer@0.4.0
  - @itk-viewer/vtkjs@0.2.0
  - @itk-viewer/io@0.2.0
  - @itk-viewer/remote-viewport@0.2.14

## 0.3.0

### Minor Changes

- 96c064a: View 2D: Auto pick slicing axis from image bounds.

### Patch Changes

- Updated dependencies [96c064a]
  - @itk-viewer/viewer@0.3.0
  - @itk-viewer/vtkjs@0.1.0
  - @itk-viewer/remote-viewport@0.2.13

## 0.2.13

### Patch Changes

- Updated dependencies [cc64b6a]
  - @itk-viewer/viewer@0.2.9
  - @itk-viewer/remote-viewport@0.2.12
  - @itk-viewer/vtkjs@0.0.6

## 0.2.12

### Patch Changes

- Updated dependencies [ac6ec74]
  - @itk-viewer/io@0.1.8
  - @itk-viewer/remote-viewport@0.2.11
  - @itk-viewer/viewer@0.2.8
  - @itk-viewer/vtkjs@0.0.5

## 0.2.11

### Patch Changes

- 9235b41: Hide view-2d GUI input controls if just 1 option.
- bd33e7a: Add itk-viewer-2d componenet which wraps itk-viewer.
- Updated dependencies [bd33e7a]
  - @itk-viewer/io@0.1.7
  - @itk-viewer/remote-viewport@0.2.10
  - @itk-viewer/viewer@0.2.7
  - @itk-viewer/vtkjs@0.0.4

## 0.2.10

### Patch Changes

- 560e3e2: Add orthographic camera and zooming to 2D view.
- 7d7ebd5: Rename itk-view-2d-controls-shoelace
- Updated dependencies [560e3e2]
- Updated dependencies [7d7ebd5]
  - @itk-viewer/remote-viewport@0.2.9
  - @itk-viewer/arcball@0.0.1
  - @itk-viewer/viewer@0.2.6
  - @itk-viewer/utils@0.1.3
  - @itk-viewer/vtkjs@0.0.3
  - @itk-viewer/io@0.1.6

## 0.2.9

### Patch Changes

- Updated dependencies [a896e57]
  - @itk-viewer/vtkjs@0.0.2

## 0.2.8

### Patch Changes

- c13abd2: Add view-2d-vtkjs. Fix computeRanges.
- 991d042: Performance improvements to canvas blitting and render loop
- 14817ae: Load image with bounded by clip bounds.
- Updated dependencies [c13abd2]
- Updated dependencies [991d042]
- Updated dependencies [14817ae]
  - @itk-viewer/remote-viewport@0.2.8
  - @itk-viewer/viewer@0.2.5
  - @itk-viewer/vtkjs@0.0.1
  - @itk-viewer/io@0.1.5

## 0.2.7

### Patch Changes

- 7163009: Remote renderer changes rendered frame size based on client canvas size.
- 0219988: remote-viewport clips rendered image space.
- 8f26a13: Add WebRTC for remote-viewport and fix framerate based image scale picking.
- Updated dependencies [7163009]
- Updated dependencies [0219988]
- Updated dependencies [8f26a13]
  - @itk-viewer/remote-viewport@0.2.7
  - @itk-viewer/viewer@0.2.4
  - @itk-viewer/io@0.1.4

## 0.2.6

### Patch Changes

- 6191b9a: Change remote image scale based on fpsWatcher. Includes image memory size check.
- Updated dependencies [6191b9a]
  - @itk-viewer/remote-viewport@0.2.6
  - @itk-viewer/viewer@0.2.3
  - @itk-viewer/io@0.1.3

## 0.2.5

### Patch Changes

- e187ce4: Remote-Zarr service from remote-image package returns a Zarr store to create a ZarrMultiscaleSpatialImage for use by remote-viewport. Adds reset camera logic in viewport actor.
- Updated dependencies [e187ce4]
  - @itk-viewer/remote-viewport@0.2.5
  - @itk-viewer/viewer@0.2.2

## 0.2.4

### Patch Changes

- bd7b09f: Bump remote-viewport publish
- Updated dependencies [bd7b09f]
  - @itk-viewer/remote-viewport@0.2.4

## 0.2.3

### Patch Changes

- 619b5f7: Upgrade version of @itk-wasm/htj2k
- Updated dependencies [619b5f7]
  - @itk-viewer/remote-viewport@0.2.3

## 0.2.2

### Patch Changes

- b85a579: Route MultiscaleSpatialImages through Viewport actor to RemoteViewport actor.
- Updated dependencies [b85a579]
  - @itk-viewer/remote-viewport@0.2.2
  - @itk-viewer/viewer@0.2.1
  - @itk-viewer/io@0.1.2

## 0.2.1

### Patch Changes

- 50d1b90: Add server config attribute to itk-remote-viewport.
- Updated dependencies [761780f]
- Updated dependencies [50d1b90]
  - @itk-viewer/remote-viewport@0.2.1

## 0.2.0

### Minor Changes

- bcf72aa: Add HTJ2K remote-viewport image transfer.

### Patch Changes

- Updated dependencies [bcf72aa]
  - @itk-viewer/remote-viewport@0.2.0
  - @itk-viewer/viewer@0.2.0

## 0.1.3

### Patch Changes

- d1bbabd: Rename remote-machine renderer prop imageFile to image
- 5a6eb88: Add image attribute to itk-remote-viewport
- Updated dependencies [d1bbabd]
- Updated dependencies [5a6eb88]
  - @itk-viewer/remote-viewport@0.1.3

## 0.1.2

### Patch Changes

- 964a6766: Use canvas element to display remote frame.
- Updated dependencies [964a6766]
  - @itk-viewer/remote-viewport@0.1.2

## 0.1.1

### Patch Changes

- Fix workspace monorepo dependances.
- Updated dependencies
  - @itk-viewer/remote-viewport@0.1.1
  - @itk-viewer/viewer@0.1.1
  - @itk-viewer/io@0.1.1

## 0.1.0

### Minor Changes

- cf4d55c: Remote Hypha viewport

### Patch Changes

- Updated dependencies [cf4d55c]
  - @itk-viewer/io@0.1.0
  - @itk-viewer/remote-viewport@0.1.0
  - @itk-viewer/viewer@0.1.0
