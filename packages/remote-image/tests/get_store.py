import os
import asyncio
from imjoy_rpc.hypha import connect_to_server

from dotenv import load_dotenv

async def main():
    hypha_server_url = os.environ.get("HYPHA_SERVER_URL", "https://hypha.website")
    server = await connect_to_server({"server_url": hypha_server_url})

    svc = await server.get_service("remote-zarr")

    ret = await svc.getStore("first_instar_brain_zyxc.zarr")
    # ret = await svc.getStore("aneurism.ome.tif")
    print(ret)
    print(await ret.containsItem(".zattrs"))
    print(await ret.getItem(".zattrs"))


asyncio.run(main())
