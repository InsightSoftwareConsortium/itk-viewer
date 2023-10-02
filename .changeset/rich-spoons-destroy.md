---
'@itk-viewer/element': patch
'@itk-viewer/remote-viewport': patch
'@itk-viewer/viewer': patch
---

Remote-Zarr service from remote-image package returns a Zarr store to create a ZarrMultiscaleSpatialImage for use by remote-viewport. Adds reset camera logic in viewport actor.
