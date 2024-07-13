# @itk-viewer/remote-viewport

## 0.2.17

### Patch Changes

- @itk-viewer/io@0.4.1
- @itk-viewer/viewer@0.5.2

## 0.2.16

### Patch Changes

- Updated dependencies [0871fbb]
  - @itk-viewer/io@0.4.0
  - @itk-viewer/viewer@0.5.1

## 0.2.15

### Patch Changes

- Updated dependencies [ac23fbc]
  - @itk-viewer/viewer@0.5.0
  - @itk-viewer/io@0.3.0

## 0.2.14

### Patch Changes

- Updated dependencies [99d78de]
- Updated dependencies [ff46215]
  - @itk-viewer/viewer@0.4.0
  - @itk-viewer/io@0.2.0

## 0.2.13

### Patch Changes

- Updated dependencies [96c064a]
  - @itk-viewer/viewer@0.3.0

## 0.2.12

### Patch Changes

- Updated dependencies [cc64b6a]
  - @itk-viewer/viewer@0.2.9

## 0.2.11

### Patch Changes

- Updated dependencies [ac6ec74]
  - @itk-viewer/io@0.1.8
  - @itk-viewer/viewer@0.2.8

## 0.2.10

### Patch Changes

- Updated dependencies [bd33e7a]
  - @itk-viewer/io@0.1.7
  - @itk-viewer/viewer@0.2.7

## 0.2.9

### Patch Changes

- 560e3e2: Add orthographic camera and zooming to 2D view.
- Updated dependencies [560e3e2]
- Updated dependencies [7d7ebd5]
  - @itk-viewer/viewer@0.2.6
  - @itk-viewer/utils@0.1.3
  - @itk-viewer/io@0.1.6

## 0.2.8

### Patch Changes

- c13abd2: Add view-2d-vtkjs. Fix computeRanges.
- 991d042: Performance improvements to canvas blitting and render loop
- 14817ae: Load image with bounded by clip bounds.
- Updated dependencies [c13abd2]
- Updated dependencies [991d042]
- Updated dependencies [14817ae]
  - @itk-viewer/viewer@0.2.5
  - @itk-viewer/io@0.1.5

## 0.2.7

### Patch Changes

- 7163009: Remote renderer changes rendered frame size based on client canvas size.
- 0219988: remote-viewport clips rendered image space.
- 8f26a13: Add WebRTC for remote-viewport and fix framerate based image scale picking.
- Updated dependencies [7163009]
- Updated dependencies [0219988]
- Updated dependencies [8f26a13]
  - @itk-viewer/viewer@0.2.4
  - @itk-viewer/io@0.1.4

## 0.2.6

### Patch Changes

- 6191b9a: Change remote image scale based on fpsWatcher. Includes image memory size check.
- Updated dependencies [6191b9a]
  - @itk-viewer/viewer@0.2.3
  - @itk-viewer/io@0.1.3

## 0.2.5

### Patch Changes

- e187ce4: Remote-Zarr service from remote-image package returns a Zarr store to create a ZarrMultiscaleSpatialImage for use by remote-viewport. Adds reset camera logic in viewport actor.
- Updated dependencies [e187ce4]
  - @itk-viewer/viewer@0.2.2

## 0.2.4

### Patch Changes

- bd7b09f: Bump remote-viewport publish

## 0.2.3

### Patch Changes

- 619b5f7: Upgrade version of @itk-wasm/htj2k

## 0.2.2

### Patch Changes

- b85a579: Route MultiscaleSpatialImages through Viewport actor to RemoteViewport actor.
- Updated dependencies [b85a579]
  - @itk-viewer/viewer@0.2.1
  - @itk-viewer/io@0.1.2

## 0.2.1

### Patch Changes

- 761780f: Fix out of memory error with many render calls.
- 50d1b90: Add server config attribute to itk-remote-viewport.

## 0.2.0

### Minor Changes

- bcf72aa: Add HTJ2K remote-viewport image transfer.

### Patch Changes

- Updated dependencies [bcf72aa]
  - @itk-viewer/viewer@0.2.0

## 0.1.3

### Patch Changes

- d1bbabd: Rename remote-machine renderer prop imageFile to image
- 5a6eb88: Add image attribute to itk-remote-viewport

## 0.1.2

### Patch Changes

- 964a6766: Use canvas element to display remote frame.

## 0.1.1

### Patch Changes

- Fix workspace monorepo dependances.
- Updated dependencies
  - @itk-viewer/viewer@0.1.1

## 0.1.0

### Minor Changes

- cf4d55c: Remote Hypha viewport

### Patch Changes

- Updated dependencies [cf4d55c]
  - @itk-viewer/viewer@0.1.0
