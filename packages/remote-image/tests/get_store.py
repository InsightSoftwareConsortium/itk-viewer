import asyncio
from imjoy_rpc.hypha import connect_to_server

HYPHA_SERVER_URL = "https://hypha.website"


async def main():
    server = await connect_to_server({"server_url": HYPHA_SERVER_URL})

    svc = await server.get_service("remote-zarr")

    ret = await svc.getStore("first_instar_brain_zyxc.zarr")
    # ret = await svc.getStore("aneurism.ome.tif")
    print(ret)
    print(await ret.containsItem(".zattrs"))
    print(await ret.getItem(".zattrs"))


asyncio.run(main())
