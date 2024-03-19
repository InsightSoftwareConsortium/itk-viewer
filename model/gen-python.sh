#!/usr/bin/env bash

# Generate python code for the model

script_dir="`cd $(dirname $0); pwd`"
cd $script_dir

gen-pydantic ./itk-viewer.yml --pydantic-version 2 > ../packages/viewer/python/itkviewer/model.py
