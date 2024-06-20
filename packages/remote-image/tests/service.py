import os
import asyncio
from pathlib import Path

from imjoy_rpc.hypha import connect_to_server

from dotenv import load_dotenv

from itk_viewer_remote_image import RemoteZarr

def map_path(image_path) -> str:
    script_dir = os.path.dirname(os.path.realpath(__file__))
    image_path_mapped = Path(script_dir) / '..' / '..' / '..' / 'test' / 'data' / 'input' / image_path
    return str(image_path_mapped)

async def hypha_startup():
    hypha_server_url = os.environ.get("HYPHA_SERVER_URL", "https://hypha.website")
    server = await connect_to_server(
        {"name": "remote-zarr-client", "server_url": hypha_server_url}
    )

    remote_zarr = RemoteZarr()
    await remote_zarr.connect(server, map_path)


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    task = loop.create_task(hypha_startup())
    loop.run_forever()
