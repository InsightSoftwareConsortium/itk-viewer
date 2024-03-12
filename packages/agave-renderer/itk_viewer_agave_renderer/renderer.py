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

import fractions
from av import VideoFrame
from aiortc import MediaStreamTrack

# Should match constant in connected clients.
# The WebRTC service id is different from this
RENDERER_SERVICE_ID = "agave-renderer"

class VideoTransformTrack(MediaStreamTrack):
    """
    A video stream track that transforms frames from an another track.
    """

    kind = "video"

    def __init__(self, get_frame):
        super().__init__()  # don't forget this!
        self.count = 0
        self.get_frame = get_frame

    async def recv(self):
        # frame = await self.track.recv()
        img = await self.get_frame()
        img = img or PILImage.new("RGBA", (1, 1))

        frame = VideoFrame.from_image(img)

        frame.pts = self.count
        self.count+=1
        frame.time_base = fractions.Fraction(1, 1000)
        return frame



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
        return img


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
        self.render_time = .1
        self.agave = None

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

    async def draw_frame(self):
        if self.agave is None:
            return
        r = self.agave
        start_time = time.time()
        img = r.memory_redraw()
        self.render_time = time.time() - start_time
        return img

    def get_render_time(self):
        return self.render_time

    async def render(self):
        if self.agave is None:
            return
        frame = await self.draw_frame()
        rgba = frame.convert("RGBA").tobytes()
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
        return {"frame": rgba_encoded, 'renderTime': self.render_time}

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


    async def on_init(self, peer_connection):
        @peer_connection.on("track")
        def on_track(track):
            peer_connection.addTrack(
                VideoTransformTrack(self.draw_frame)
            )
            @track.on("ended")
            async def on_ended():
                pass

    async def connect(
        self,
        server,
        load_image_into_agave_fn,
        visibility="public",
        identifier=f"{RENDERER_SERVICE_ID}-rtc",
    ):
        self.load_image = functools.partial(load_image_into_agave_fn, self)

        service_id = identifier

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
                "getRenderTime": self.get_render_time,
                "updateRenderer": self.update_renderer,
            }
        )

        await register_rtc_service(
            server,
            service_id=service_id,
            config={
                "visibility": "public",
                "on_init": self.on_init,
            },
        )

        print("Renderer is ready to receive request!", server.config, flush=True)
