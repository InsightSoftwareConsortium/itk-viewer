import asyncio

from itk_viewer_remote_image import RemoteZarr

HYPHA_SERVER_URL = "https://hypha.website"

remoteZarr = RemoteZarr()


def map_path(image_path) -> str:
    return f"../../../test/data/input/{image_path}"


if __name__ == "__main__":
    loop = asyncio.new_event_loop()
    task = loop.create_task(remoteZarr.connect(HYPHA_SERVER_URL, map_path))
    loop.run_forever()
