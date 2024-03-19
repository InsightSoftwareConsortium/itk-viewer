from .common import test_input_path

from itkwasm_image_io import imread

from itkviewer import ViewerMachine

def test_data_manager_serialization():
    viewer_machine = ViewerMachine()

    input_image_path = test_input_path / 'HeadMRVolume.nrrd'
    image = imread(input_image_path)

    viewer_machine.load()
    viewer_machine.run()

    from rich import print
    assert len(viewer_machine.config.dataManager.images) == 0

    viewer_machine.send('SetImage', image)
    # assert len(viewer_machine.config.dataManager.images) == 1
