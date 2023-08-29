# SPDX-FileCopyrightText: 2023-present NumFOCUS
#
# SPDX-License-Identifier: Apache-2.0

import time
from enum import Enum, auto
import functools

import agave_pyclient as agave
from imjoy_rpc.hypha import connect_to_server
from itkwasm_htj2k import encode
from itkwasm import Image, ImageType, PixelTypes, IntTypes
import numpy as np
from PIL import Image as PILImage

class AgaveRendererMemoryRedraw(agave.AgaveRenderer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def memory_redraw(self):
        self.cb.add_command("REDRAW")
        buf = self.cb.make_buffer()
        # TODO ENSURE CONNECTED
        self.ws.send(buf, True)
        #  and then WAIT for render to be completed
        binarydata = self.ws.wait_for_image()
        # ready for next frame
        self.cb = agave.commandbuffer.CommandBuffer()
        img = PILImage.open(binarydata)
        rgba = img.convert('RGBA').tobytes()
        return rgba

# how to handle unknown events
class UnknownEventAction(Enum):
    ERROR = auto()
    WARNING = auto()
    IGNORE = auto()

class Renderer():
    def __init__(self, width=500, height=400, unknown_event_action=UnknownEventAction.WARNING):
        self.width = width
        self.height = height
        self.unknown_event_action = unknown_event_action

    async def setup(self):
        # Note: the agave websocket server needs to be running
        self.agave = AgaveRendererMemoryRedraw()
        self.agave.set_resolution(self.width, self.height)

    async def render(self):
        r = self.agave
        start_time = time.time()
        rgba = r.memory_redraw()
        image_type = ImageType(dimension=2, componentType=IntTypes.UInt8, pixelType=PixelTypes.RGBA, components=4)
        image = Image(image_type)
        image.size = [self.width, self.height]
        image.data = np.frombuffer(rgba, dtype=np.uint8)
        # lossless
        # rgba_encoded = encode(image)
        rgba_encoded = encode(image, not_reversible=True, quantization_step=0.02)
        elapsed = time.time() - start_time
        return { "frame": rgba_encoded, "renderTime": elapsed }

    def update_renderer(self, events):
        r = self.agave

        for [event_type, payload] in events:
           match event_type:
                case 'density':
                    r.density(payload)
                case 'cameraPose':
                   eye = payload['eye']
                   r.eye(eye[0], eye[1], eye[2])
                   up = payload['up']
                   r.up(up[0], up[1], up[2])
                   target = payload['target']
                   r.target(target[0], target[1], target[2])
                case 'renderIterations':
                   r.render_iterations(payload)
                case _:
                    self.handle_unknown_event(event_type)

    def handle_unknown_event(self, event_type):
       match self.unknown_event_action:
            case UnknownEventAction.ERROR:
                raise Exception(f"Unknown event type: {event_type}")
            case UnknownEventAction.WARNING:
                print(f"Unknown event type: {event_type}", flush=True)
            case UnknownEventAction.IGNORE:
                pass

    async def connect(self, hypha_server_url, load_image_into_agave_fn, visibility="public", identifier="agave-renderer"):
        server = await connect_to_server(
            {
              "name": "agave-renderer-client",
              "server_url": hypha_server_url
            }
        )

        await server.register_service({
            "name": "Agave Renderer",
            "id": identifier,
            "config": {
                "visibility": visibility,
                "require_context": False,
                "run_in_executor": False,
            },

            "setup": self.setup,

            "loadImage": functools.partial(load_image_into_agave_fn, self),

            "render": self.render,
            "updateRenderer": self.update_renderer,
        })
        print("Renderer is ready to receive request!",  server.config, flush=True)