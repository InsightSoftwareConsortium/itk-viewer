from __future__ import annotations
from datetime import datetime, date
from enum import Enum

from decimal import Decimal
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel as BaseModel, Field, validator
import re
import sys
if sys.version_info >= (3, 8):
    from typing import Literal
else:
    from typing_extensions import Literal


metamodel_version = "None"
version = "None"

class WeakRefShimBaseModel(BaseModel):
   __slots__ = '__weakref__'

class ConfiguredBaseModel(WeakRefShimBaseModel,
                validate_assignment = True,
                validate_all = True,
                underscore_attrs_are_private = True,
                extra = 'forbid',
                arbitrary_types_allowed = True,
                use_enum_values = True):

    pass

        

class EventType(str):
    """
    The types of events that can be sent to actors.
    """
    
    dummy = "dummy"
    

class UnknownEventAction(str, Enum):
    """
    The types of actions that can be taken when an unknown event is received.
    """
    # Ignore the event.
    Ignore = "Ignore"
    # Log a warning and ignore the event.
    Warn = "Warn"
    # Throw an error.
    Error = "Error"
    
    

class RendererEventType(str, Enum):
    """
    The types of render events that can be sent to renderers.
    """
    # A render event is a message that instructs a renderer to render a scene to an in-memory RGB image.
    Render = "Render"
    
    

class Actor(ConfiguredBaseModel):
    """
    In the Actor Model mathematical of computation, an actor is a computational entity that, in response to a message it receives, can concurrently:
- send a finite number of messages to other actors; - create a finite number of new actors; - designate the behavior to be used for the next message it receives.
Supported messages are defined in the Event classes. The valid Events' for an Actor are defined defined by the `receives` relationship. To send an Event to an Actor, use the `send` method.
Actors are typically implement as finite state machines.
    """
    unknown_event_action: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Viewer(Actor):
    """
    A viewer is an interface that allows users to view and interact with multi-dimensional images, geometry, and point sets.
    """
    unknown_event_action: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Viewport(Actor):
    """
    A viewport is a rectangular region of a viewer that displays a rendering of the scene.
    """
    width: int = Field(640, description="""The width of the viewport in pixels.""")
    height: int = Field(480, description="""The height of the viewport in pixels.""")
    unknown_event_action: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class MultiscaleImage(Actor):
    """
    A multiscale image is a multi-dimensional image, based on the OME-Zarr data model, often preprocessed, that supports efficient rendering at multiple resolutions.
    """
    unknown_event_action: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Renderer(Actor):
    """
    A renderer is an actor that renders a scene to an in-memory RGB image for display in a viewport.
    """
    viewport: Viewport = Field(..., description="""The viewport that displays the rendered RGB image.""")
    width: int = Field(640, description="""The width of the canvas in pixels.""")
    height: int = Field(480, description="""The height of the canvas in pixels.""")
    unknown_event_action: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Event(ConfiguredBaseModel):
    """
    An event is a message that can be sent to an actor. The actor can respond to the event by changing its state, sending messages to other actors, or creating new actors.
    """
    type: EventType = Field(..., description="""The type of the event.""")
    
    

class RendererEvent(Event):
    """
    A RendererEvent is an Event supported by a Renderer.
    """
    type: RendererEventType = Field(..., description="""The type of the event.""")
    
    

class RenderEvent(RendererEvent):
    """
    A render event is a message that instructs a renderer to render a scene to an in-memory RGB image.
    """
    type: RendererEventType = Field(..., description="""The type of the event.""")
    
    


# Update forward refs
# see https://pydantic-docs.helpmanual.io/usage/postponed_annotations/
Actor.update_forward_refs()
Viewer.update_forward_refs()
Viewport.update_forward_refs()
MultiscaleImage.update_forward_refs()
Renderer.update_forward_refs()
Event.update_forward_refs()
RendererEvent.update_forward_refs()
RenderEvent.update_forward_refs()

