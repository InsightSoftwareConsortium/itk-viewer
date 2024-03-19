from typing import Optional

from statemachine import StateMachine, State

from .model import Viewer
from .data_manager import DataManagerMachine

from itkwasm import Image

class ViewerMachine(StateMachine):
    idle = State(initial=True)
    loading = State()
    running = State()
    shutting_down = State(final=True)

    load = idle.to(loading)
    run = loading.to(running)
    shutdown = running.to(shutting_down)

    SetImage = running.to.itself(internal=True)

    def __init__(self, config: Optional[Viewer]=None):
        super(ViewerMachine, self).__init__()

        viewer = config or Viewer()
        self.config = viewer

    @property
    def config(self):
        self.viewer.dataManager = self.data_manager_machine.config
        return self.viewer

    @config.setter
    def config(self, config: Viewer):
        self.viewer = config
        self.data_manager_machine = DataManagerMachine(self.viewer.dataManager)

    def on_enter_loading(self):
        self.data_manager_machine.load()

    def on_enter_running(self):
        self.data_manager_machine.run()

    @SetImage.on
    def set_image(self, image: Image):
        self.data_manager_machine.send('SetImage', image)
