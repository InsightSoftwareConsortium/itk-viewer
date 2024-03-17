from typing import Optional

from statemachine import StateMachine, State

from .model import DataManager

class DataManagerMachine(StateMachine):
    idle = State(initial=True)
    loading = State()
    running = State()
    shutting_down = State(final=True)

    load = idle.to(loading)
    run = loading.to(running)
    shutdown = running.to(shutting_down)

    def __init__(self, config: Optional[DataManager]=None):
        super(DataManagerMachine, self).__init__()

        if config:
            self.load_config(config)

    @property
    def config(self):
        return {

        }

    @config.setter
    def config(self, config: DataManager):
        self.load_config(config)

    def load_config(self, config: DataManager):
        self.data_manager = config