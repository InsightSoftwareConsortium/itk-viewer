from typing import Optional

from statemachine import StateMachine, State

from .model import Viewer, DataManager
from .data_manager import DataManagerMachine

class ViewerMachine(StateMachine):
    idle = State(initial=True)
    loading = State()
    running = State()
    shutting_down = State(final=True)

    load = idle.to(loading)
    run = loading.to(running)
    shutdown = running.to(shutting_down)

    def __init__(self, config: Optional[Viewer]=None):
        super(ViewerMachine, self).__init__()

        if config:
            self.load_config(config)
        else:
            self.load_config({})

    @property
    def config(self):
        return {
            'DataManager': self.data_manager.config
        }

    @config.setter
    def config(self, config: Viewer):
        self.load_config(config)

    def load_config(self, config: Viewer):
        self.data_manager = DataManagerMachine(config=config.get('DataManager', DataManager()))
