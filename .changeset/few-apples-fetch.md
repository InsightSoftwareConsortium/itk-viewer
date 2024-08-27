---
'@itk-viewer/transfer-function-editor': patch
'@itk-viewer/element': patch
'@itk-viewer/vtkjs': patch
---

Fix error when unmounting renderer by calling setContainer(undefined) and imageSnapshot happens. 

Don't show viewer GUI controls when no image is loaded.
