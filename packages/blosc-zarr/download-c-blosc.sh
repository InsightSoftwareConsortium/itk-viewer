#!/usr/bin/env bash

[ ! -d "./c-blosc" ] && git clone --depth 1 -b v1.21.3 https://github.com/Blosc/c-blosc

return 0