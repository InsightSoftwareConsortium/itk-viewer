from typing import Optional

from statemachine import StateMachine, State

from .model import DataManager, StoreModel

from itkwasm import Image
import ngff_zarr

from dataclasses import dataclass

@dataclass
class MachineImageData:
    multiscales: ngff_zarr.Multiscales
    store: Optional[StoreModel] = None
    dataUri: Optional[str] = None

class DataManagerMachine(StateMachine):
    idle = State(initial=True)
    loading = State()
    running = State()
    shutting_down = State(final=True)

    load = idle.to(loading)
    run = loading.to(running)
    shutdown = running.to(shutting_down)

    SetImage = running.to.itself(internal=True)

    def __init__(self, config: Optional[DataManager]=None):
        super(DataManagerMachine, self).__init__()

        data_manager = config or DataManager()
        self.config = data_manager

    @property
    def config(self):
        return self.data_manager

    @config.setter
    def config(self, config: DataManager):
        self.data_manager = config
        self.image_count = 0
        self.images = {}
        # for image_data in self.data_manager.images:
        #     if image_data.store is not None:
        #         image_data.store = StoreMachine(image_data.store)
        #     elif image_data.dataUri is not None:
        #         image_data.dataUri = ImageDataUriMachine(image_data.dataUri)
        #     else:
        #         raise ValueError("ImageData must have a store or dataUri.")

    @SetImage.on
    def set_image(self, image: Image):
        pass
        # self.images