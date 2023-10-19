# SPDX-FileCopyrightText: 2023-present NumFOCUS
#
# SPDX-License-Identifier: Apache-2.0

import time
from enum import Enum, auto
import functools

import agave_pyclient as agave
from imjoy_rpc.hypha import connect_to_server, register_rtc_service
from itkwasm_htj2k import encode
from itkwasm import Image, ImageType, PixelTypes, IntTypes
import numpy as np
from PIL import Image as PILImage

# Should match constant in connected clients.
# The WebRTC service id is different from this
RENDERER_SERVICE_ID = "agave-renderer"


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
        rgba = img.convert("RGBA").tobytes()
        return rgba


# how to handle unknown events
class UnknownEventAction(Enum):
    ERROR = auto()
    WARNING = auto()
    IGNORE = auto()


class Renderer:
    def __init__(
        self, width=500, height=400, unknown_event_action=UnknownEventAction.WARNING
    ):
        self.width = width
        self.height = height
        self.unknown_event_action = unknown_event_action

    async def setup(self):
        # Note: the agave websocket server needs to be running
        self.agave = AgaveRendererMemoryRedraw()
        self.agave.set_resolution(self.width, self.height)

        self.agave.skylight_top_color(1, 1, 1)
        self.agave.skylight_middle_color(1, 1, 1)
        self.agave.skylight_bottom_color(1, 1, 1)
        self.agave.light_pos(0, 10, 0, 1.5708)
        self.agave.light_color(0, 100, 100, 100)
        self.agave.light_size(0, 1, 1)
        self.agave.background_color(0, 0, 0)
        self.agave.exposure(0.75)

        self.agave.show_bounding_box(1)
        self.agave.bounding_box_color(1, 1, 1)
        self.agave.render_iterations(1)
        self.agave.set_primary_ray_step_size(2)
        self.agave.set_secondary_ray_step_size(4)

        self.agave.camera_projection(0, 55)
        self.agave.aperture(0)
        self.agave.focaldist(0.75)

    def set_render_size(self, width, height):
        self.width = width
        self.height = height
        self.agave.set_resolution(width, height)

    async def render(self):
        r = self.agave
        start_time = time.time()
        rgba = r.memory_redraw()
        image_type = ImageType(
            dimension=2,
            componentType=IntTypes.UInt8,
            pixelType=PixelTypes.RGBA,
            components=4,
        )
        image = Image(image_type)
        image.size = [self.width, self.height]
        image.data = np.frombuffer(rgba, dtype=np.uint8)
        # rgba_encoded = encode(image) # lossless
        rgba_encoded = encode(image, not_reversible=True, quantization_step=0.02)
        elapsed = time.time() - start_time
        return {"frame": rgba_encoded, "renderTime": elapsed}

    async def update_renderer(self, events):
        r = self.agave

        for [event_type, payload] in events:
            match event_type:
                case "loadImage":
                    await self.load_image(**payload)
                case "cameraPose":
                    eye = payload["eye"]
                    r.eye(eye[0], eye[1], eye[2])
                    up = payload["up"]
                    r.up(up[0], up[1], up[2])
                    target = payload["center"]
                    r.target(target[0], target[1], target[2])
                case "renderSize":
                    self.set_render_size(payload[0], payload[1])
                case "density":
                    r.density(payload)
                case "renderIterations":
                    r.render_iterations(payload)
                case "normalizedClipBounds":
                    r.set_clip_region(*payload)
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

    async def connect(
        self,
        hypha_server_url,
        load_image_into_agave_fn,
        visibility="public",
        identifier="agave-renderer-rtc",
    ):
        self.load_image = functools.partial(load_image_into_agave_fn, self)

        service_id = identifier
        client_id = service_id + "-client"
        server = await connect_to_server(
            {
                "client_id": client_id,
                "server_url": hypha_server_url,
            }
        )

        await server.register_service(
            {
                "id": RENDERER_SERVICE_ID,
                "config": {
                    "visibility": visibility,
                    "require_context": False,
                    "run_in_executor": False,
                },
                "setup": self.setup,
                "loadImage": self.load_image,
                "render": self.render,
                "updateRenderer": self.update_renderer,
            }
        )

        await register_rtc_service(
            server,
            service_id=service_id,
            config={
                "visibility": "public",
            },
        )

        print("Renderer is ready to receive request!", server.config, flush=True)
