# @itk-viewer/viewer

## 0.6.0

### Minor Changes

- dae0e89: Add opacity function editor to View 3D.

## 0.5.3

### Patch Changes

- @itk-viewer/io@0.4.2

## 0.5.2

### Patch Changes

- @itk-viewer/io@0.4.1

## 0.5.1

### Patch Changes

- Updated dependencies [0871fbb]
  - @itk-viewer/io@0.4.0

## 0.5.0

### Minor Changes

- ac23fbc: 2D-View: Add color range slider using Transfer Function Editor

### Patch Changes

- Updated dependencies [ac23fbc]
  - @itk-viewer/io@0.3.0

## 0.4.0

### Minor Changes

- 99d78de: View-2d slices in IJK image space instead of world XYZ.
- ff46215: Add slice axis GUI controls for View 2D

### Patch Changes

- Updated dependencies [99d78de]
  - @itk-viewer/io@0.2.0

## 0.3.0

### Minor Changes

- 96c064a: View 2D: Auto pick slicing axis from image bounds.

## 0.2.9

### Patch Changes

- cc64b6a: Fix orientation of view-2d

## 0.2.8

### Patch Changes

- Updated dependencies [ac6ec74]
  - @itk-viewer/io@0.1.8

## 0.2.7

### Patch Changes

- Updated dependencies [bd33e7a]
  - @itk-viewer/io@0.1.7

## 0.2.6

### Patch Changes

- 560e3e2: Add orthographic camera and zooming to 2D view.
- Updated dependencies [560e3e2]
- Updated dependencies [7d7ebd5]
  - @itk-viewer/utils@0.1.3
  - @itk-viewer/io@0.1.6

## 0.2.5

### Patch Changes

- c13abd2: Add view-2d-vtkjs. Fix computeRanges.
- 991d042: Performance improvements to canvas blitting and render loop
- 14817ae: Load image with bounded by clip bounds.
- Updated dependencies [c13abd2]
- Updated dependencies [14817ae]
  - @itk-viewer/io@0.1.5

## 0.2.4

### Patch Changes

- 7163009: Remote renderer changes rendered frame size based on client canvas size.
- 0219988: remote-viewport clips rendered image space.
- 8f26a13: Add WebRTC for remote-viewport and fix framerate based image scale picking.
- Updated dependencies [0219988]
- Updated dependencies [8f26a13]
  - @itk-viewer/io@0.1.4

## 0.2.3

### Patch Changes

- 6191b9a: Change remote image scale based on fpsWatcher. Includes image memory size check.
- Updated dependencies [6191b9a]
  - @itk-viewer/io@0.1.3

## 0.2.2

### Patch Changes

- e187ce4: Remote-Zarr service from remote-image package returns a Zarr store to create a ZarrMultiscaleSpatialImage for use by remote-viewport. Adds reset camera logic in viewport actor.

## 0.2.1

### Patch Changes

- b85a579: Route MultiscaleSpatialImages through Viewport actor to RemoteViewport actor.
- Updated dependencies [b85a579]
  - @itk-viewer/io@0.1.2

## 0.2.0

### Minor Changes

- bcf72aa: Add HTJ2K remote-viewport image transfer.

## 0.1.1

### Patch Changes

- Fix workspace monorepo dependances.
- Updated dependencies
  - @itk-viewer/io@0.1.1

## 0.1.0

### Minor Changes

- cf4d55c: Remote Hypha viewport

### Patch Changes

- Updated dependencies [cf4d55c]
  - @itk-viewer/io@0.1.0
