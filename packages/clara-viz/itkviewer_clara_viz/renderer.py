from itkviewer import Viewport, Renderer

class ClaraVizRenderer(Renderer):
    """itk-viewer renderer that renders images using ClaraViz."""

    def __init__(self, viewport: Viewport, width: int=640, height: int=480):
        super().__init__(viewport, width, height)