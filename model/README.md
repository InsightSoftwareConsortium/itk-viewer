# itk-viewer model

A [LinkML] model of itk-viewer's architecture.

The viewer is built on the [Actor Model]. This model defines the Actors and their relationships. It also defines the Events, which are the messages sent to Actors. It defines all the Events an Actor can receive. The data model of the Events is also used to generate the corresponding TypeScript interfaces and Python pydantic dataclasses.

.. LinkML: https://linkml.io/
.. Actor Model: https://en.wikipedia.org/wiki/Actor_model