from typing import List

from itkviewer import Viewport, Renderer, RendererEvent, RendererEventType

class ClaraVizRenderer(Renderer):
    """itk-viewer renderer that renders images using ClaraViz."""

    def __init__(self, viewport: Viewport, width: int=640, height: int=480):
        super().__init__(viewport, width, height)

    async def batch(self, events: List[RendererEvent]):
        """Batch process a list of events."""
        for event in events:
            self.send(event)

    async def send(self, event: RendererEvent):
        """Send an event to the renderer."""
        match event.type:
            case RendererEventType.Render:
                self.render()
            case _:
                raise ValueError(f"Unknown event type: {event.type}")

    async def render(self):
        """Render the scene to an in-memory RGB image."""
        pass