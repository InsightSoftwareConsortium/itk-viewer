from __future__ import annotations
from datetime import datetime, date
from enum import Enum

from decimal import Decimal
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel as BaseModel, ConfigDict,  Field, field_validator
import re
import sys
if sys.version_info >= (3, 8):
    from typing import Literal
else:
    from typing_extensions import Literal


metamodel_version = "None"
version = "0.0.1"

class ConfiguredBaseModel(BaseModel):
    model_config = ConfigDict(
        validate_assignment=True,
        validate_default=True,
        extra = 'forbid',
        arbitrary_types_allowed=True,
        use_enum_values = True)

    pass

        

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
    
    

class Actor(ConfiguredBaseModel):
    """
    In the Actor Model mathematical of computation, an actor is a computational entity that, in response to a message it receives, can concurrently:
- send a finite number of messages to other actors; - create a finite number of new actors; - designate the behavior to be used for the next message it receives.
Supported messages are defined in the Event classes. The valid Events' for an Actor are defined defined by the `receives` relationship. To send an Event to an Actor, use the `send` method.
Actors are typically implement as finite state machines.
    """
    unknownEventAction: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Viewer(Actor):
    """
    A viewer is an interface that allows users to view and interact with multi-dimensional images, geometry, and point sets.
    """
    title: Optional[str] = Field("\"ITK Viewer\"", description="""The title of the viewer.""")
    dataManager: Optional[DataManager] = Field(None, description="""The data manager for the viewer.""")
    unknownEventAction: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Viewport(Actor):
    """
    A viewport is a rectangular region of a viewer that displays a rendering of the scene.
    """
    width: int = Field(640, description="""The width of the viewport in pixels.""")
    height: int = Field(480, description="""The height of the viewport in pixels.""")
    unknownEventAction: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Image(ConfiguredBaseModel):
    """
    An itk-wasm Image to be displayed in the viewer.
    """
    None
    
    

class StoreModel(ConfiguredBaseModel):
    """
    Parameters of a Zarr store following the data model implied by Zarr-Python.
    """
    type: Literal["StoreModel"] = Field("StoreModel", description="""The type of the Zarr store model.""")
    
    

class DirectoryStore(StoreModel):
    """
    A Zarr store that is backed by a directory on the file system.
    """
    path: str = Field(..., description="""The path to the directory on the file system that contains the Zarr store.""")
    type: Literal["DirectoryStore"] = Field("DirectoryStore", description="""The type of the Zarr store model.""")
    
    

class FSStore(StoreModel):
    """
    A Zarr store that can be wrapped an fsspec.FSMap in Python to give access to arbitrary filesystems
    """
    url: str = Field(..., description="""Protocol and path, like “s3://bucket/root.zarr” or \"https://example.com/image.ome.zarr\".""")
    type: Literal["FSStore"] = Field("FSStore", description="""The type of the Zarr store model.""")
    
    

class ImageData(ConfiguredBaseModel):
    """
    Image data displayed in the viewer.
    """
    imageJson: Optional[str] = Field(None, description="""The image data in JSON format. An ITK-Wasm Image with the pixel data zstd compressed and base64-encoded.""")
    store: Optional[Union[StoreModel,DirectoryStore,FSStore]] = Field(None, description="""The OME-Zarr store model for the image data.""")
    
    

class MultiscaleImage(Actor):
    """
    A multiscale image is a multi-dimensional image, based on the OME-Zarr data model, often preprocessed, that supports efficient rendering at multiple resolutions.
    """
    unknownEventAction: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class DataManager(Actor):
    """
    A data manager is an actor that manages the loading and caching of data for rendering.
    """
    images: List[ImageData] = Field(default_factory=list, description="""The images displayed by the viewer.""")
    unknownEventAction: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Renderer(Actor):
    """
    A renderer is an actor that renders a scene to an in-memory RGB image for display in a viewport.
    """
    viewport: Viewport = Field(..., description="""The viewport that displays the rendered RGB image.""")
    width: int = Field(640, description="""The width of the canvas in pixels.""")
    height: int = Field(480, description="""The height of the canvas in pixels.""")
    unknownEventAction: Optional[UnknownEventAction] = Field(None, description="""The action to take when an unknown event is received.""")
    
    

class Event(ConfiguredBaseModel):
    """
    An event is a message that can be sent to an actor. The actor can respond to the event by changing its state, sending messages to other actors, or creating new actors.
    """
    type: Literal["Event"] = Field("Event", description="""The type of the event.""")
    
    

class ViewerEvent(Event):
    """
    A ViewerEvent is an Event that can be sent to a Viewer.
    """
    type: Literal["ViewerEvent"] = Field("ViewerEvent", description="""The type of the event.""")
    
    

class SetImageEvent(ViewerEvent):
    """
    A SetImageEvent is an Event that sets an image to be displayed in a viewer.
    """
    image: Image = Field(..., description="""The image to be displayed in the viewer.""")
    name: Optional[str] = Field(None, description="""The name of the image to be displayed in the viewer.""")
    type: Literal["SetImageEvent"] = Field("SetImageEvent", description="""The type of the event.""")
    
    

class RendererEvent(Event):
    """
    A RendererEvent is an Event supported by a Renderer.
    """
    type: Literal["RendererEvent"] = Field("RendererEvent", description="""The type of the event.""")
    
    

class RenderEvent(RendererEvent):
    """
    A render event is a message that instructs a renderer to render a scene to an in-memory RGB image.
    """
    type: Literal["RenderEvent"] = Field("RenderEvent", description="""The type of the event.""")
    
    


# Model rebuild
# see https://pydantic-docs.helpmanual.io/usage/models/#rebuilding-a-model
Actor.model_rebuild()
Viewer.model_rebuild()
Viewport.model_rebuild()
Image.model_rebuild()
StoreModel.model_rebuild()
DirectoryStore.model_rebuild()
FSStore.model_rebuild()
ImageData.model_rebuild()
MultiscaleImage.model_rebuild()
DataManager.model_rebuild()
Renderer.model_rebuild()
Event.model_rebuild()
ViewerEvent.model_rebuild()
SetImageEvent.model_rebuild()
RendererEvent.model_rebuild()
RenderEvent.model_rebuild()

