# SPDX-FileCopyrightText: 2023-present NumFOCUS
#
# SPDX-License-Identifier: Apache-2.0

from pathlib import Path

from imjoy_rpc.hypha import connect_to_server
import zarr
from ngff_zarr import (
    detect_cli_io_backend,
    ConversionBackend,
    cli_input_to_ngff_image,
    to_multiscales,
    to_ngff_zarr,
    Methods,
)


def encode_zarr_store(store):
    def getItem(key):
        return store[key]

    def setItem(key, value):
        store[key] = value

    def containsItem(key):
        return key in store

    return {
        "_rintf": True,
        "_rtype": "zarr-store",
        "getItem": getItem,
        "setItem": setItem,
        "containsItem": containsItem,
    }


def _make_multiscale_store():
    # Todo: for very large images serialize to disk cache
    # -> create DirectoryStore in cache directory and return as the chunk_store
    store = zarr.storage.MemoryStore(dimension_separator="/")
    return store, None


class RemoteZarr:
    def __init__(self):
        pass

    async def get_store(self, image_path):
        print(f"get_store: {image_path}", flush=True)

        mapped_path = self.map_path(image_path)

        if mapped_path.find("://") == -1 and not Path(mapped_path).exists():
            print(f"File not found: {mapped_path}\n", flush=True)
            raise Exception(f"File not found: {mapped_path}\n")

        backend = detect_cli_io_backend([mapped_path])
        if backend is ConversionBackend.NGFF_ZARR:
            return zarr.storage.DirectoryStore(mapped_path)

        # TODO: code below does not work yet
        image = cli_input_to_ngff_image(backend, [mapped_path])
        multiscales = to_multiscales(image, method=Methods.DASK_IMAGE_GAUSSIAN)
        store, chunk_store = _make_multiscale_store()
        to_ngff_zarr(store, multiscales, chunk_store=chunk_store)

        return store

    async def connect(
        self,
        hypha_server_url,
        map_path=lambda p: p,
        visibility="public",
        identifier="remote-zarr",
    ):
        server = await connect_to_server(
            {"name": "remote-zarr", "server_url": hypha_server_url}
        )

        self.map_path = map_path

        await server.register_service(
            {
                "name": "Remote Zarr Service",
                "id": identifier,
                "config": {
                    "visibility": visibility,
                    "require_context": False,
                    "run_in_executor": False,
                },
                "getStore": self.get_store,
            }
        )

        server.register_codec(
            {
                "name": "zarr-store",
                "type": zarr.storage.BaseStore,
                "encoder": encode_zarr_store,
            }
        )
        print(
            "Remote Zarr Service is ready to receive requests!",
            server.config,
            flush=True,
        )
