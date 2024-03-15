# SPDX-FileCopyrightText: 2024-present NumFOCUS
#
# SPDX-License-Identifier: Apache-2.0

from typing import List

from itkviewer import Viewport, Renderer, RendererEvent, RendererEventType, UnknownEventAction

class ClaraVizRenderer(Renderer):
    """itk-viewer renderer that renders images using ClaraViz."""

    def __init__(self, viewport: Viewport, width: int=640, height: int=480, unknown_event_action=UnknownEventAction.Warning):
        super().__init__(viewport, width, height, unknown_event_action)

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
                self.handle_unknown_event(event_type)

    async def render(self):
        """Render the scene to an in-memory RGB image."""
        pass

    def handle_unknown_event(self, event_type):
        match self.unknown_event_action:
            case UnknownEventAction.Error:
                raise ValueError(f"Unknown event type: {event_type}")
            case UnknownEventAction.Warning:
                print(f"Unknown event type: {event_type}", flush=True)
            case UnknownEventAction.Ignore:
                pass