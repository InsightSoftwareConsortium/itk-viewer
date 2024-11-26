import os
from pathlib import PosixPath

from dotenv import load_dotenv

from itk_viewer_remote_image import RemoteZarr

load_dotenv()

def map_path(image_path) -> str:
    script_dir = os.path.dirname(os.path.realpath(__file__))
    image_path_mapped = PosixPath(script_dir) / "data" / image_path
    return str(image_path_mapped.resolve())

async def hypha_startup(server):
    remote_zarr = RemoteZarr()

    await remote_zarr.connect(server, map_path)