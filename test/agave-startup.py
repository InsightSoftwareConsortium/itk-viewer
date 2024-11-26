import os
import websockets

from dotenv import load_dotenv

from itk_viewer_agave_renderer import Renderer

load_dotenv()

async def check_websocket_server():
    try:
        async with websockets.connect('ws://localhost:1235') as ws:
            return True
    except Exception as e:
        print(f"Failed to connect: {e}")
        return False

async def load_image(renderer, image_path="", multiresolution_level=0, channels=[], region=[]):
    agave_renderer = renderer.agave

    script_dir = os.path.dirname(os.path.realpath(__file__))
    image_path_mapped = os.path.join(script_dir, f"data/{image_path}")

    agave_renderer.load_data(
        image_path_mapped, 0, multiresolution_level, 0, channels, region
    )

async def hypha_startup(server):
    renderer = Renderer()

    server_is_listening = await check_websocket_server()
    if not server_is_listening:
        print("Server is not listening, start with `agave --server`")
        print("Skipping tests...")
        return

    await renderer.connect(server, load_image)