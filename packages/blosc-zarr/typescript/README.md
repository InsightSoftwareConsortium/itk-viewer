# @itk-viewer/blosc-zarr

[![npm version](https://badge.fury.io/js/@itk-viewer%2Fblosc-zarr.svg)](https://www.npmjs.com/package/@itk-viewer/blosc-zarr)

Decompress Blosc compressed Zarr data in WebAssembly.

## Installation

```sh
npm install @itk-viewer/blosc-zarr
```

## Usage

### Browser interface

Import:

```js
import {
  BloscZarr,
  setPipelinesBaseUrl,
  getPipelinesBaseUrl,
  setPipelineWorkerUrl,
  getPipelineWorkerUrl,
} from "@itk-viewer/blosc-zarr"
```

#### BloscZarr

*Compress or decompress binaries with Blosc*

```ts
async function BloscZarr(
  webWorker: null | Worker,
  inputBinaryStream: string,
  outputBinaryStream: string,
  compressor: string,
  inputSize: number,
  options: BloscZarrOptions = {}
) : Promise<BloscZarrResult>
```

|       Parameter      |   Type   | Description                |
| :------------------: | :------: | :------------------------- |
|  `inputBinaryStream` | *string* | The input binary stream    |
| `outputBinaryStream` | *string* | The output binary stream   |
|     `compressor`     | *string* | Blosc compressor           |
|      `inputSize`     | *number* | Input binary size in bytes |

**`BloscZarrOptions` interface:**

|      Property      |    Type   | Description                                  |
| :----------------: | :-------: | :------------------------------------------- |
|    `decompress`    | *boolean* | Decompress instead of compress               |
|    `outputSize`    |  *number* | Output binary size in bytes                  |
| `compressionLevel` |  *number* | Compression level in compression, 0 to 9     |
|     `typesize`     |  *number* | Assumed type size in compression             |
|     `noShuffle`    | *boolean* | Do not add bitshuffle support in compression |
|      `verbose`     | *boolean* | Output status information                    |

**`BloscZarrResult` interface:**

|    Property   |   Type   | Description                    |
| :-----------: | :------: | :----------------------------- |
| **webWorker** | *Worker* | WebWorker used for computation |

#### setPipelinesBaseUrl

*Set base URL for WebAssembly assets when vendored.*

```ts
function setPipelinesBaseUrl(
  baseUrl: string | URL
) : void
```

#### getPipelinesBaseUrl

*Get base URL for WebAssembly assets when vendored.*

```ts
function getPipelinesBaseUrl() : string | URL
```

#### setPipelineWorkerUrl

*Set base URL for the itk-wasm pipeline worker script when vendored.*

```ts
function setPipelineWorkerUrl(
  baseUrl: string | URL
) : void
```

#### getPipelineWorkerUrl

*Get base URL for the itk-wasm pipeline worker script when vendored.*

```ts
function getPipelineWorkerUrl() : string | URL
```

### Node interface

Import:

```js
import {
  BloscZarrNode,
  setPipelinesBaseUrl,
  getPipelinesBaseUrl,
  setPipelineWorkerUrl,
  getPipelineWorkerUrl,
} from "@itk-viewer/blosc-zarr"
```

#### BloscZarrNode

*Compress or decompress binaries with Blosc*

```ts
async function BloscZarrNode(
  inputBinaryStream: string,
  outputBinaryStream: string,
  compressor: string,
  inputSize: number,
  options: BloscZarrOptions = {}
) : Promise<BloscZarrNodeResult>
```

|       Parameter      |   Type   | Description                |
| :------------------: | :------: | :------------------------- |
|  `inputBinaryStream` | *string* | The input binary stream    |
| `outputBinaryStream` | *string* | The output binary stream   |
|     `compressor`     | *string* | Blosc compressor           |
|      `inputSize`     | *number* | Input binary size in bytes |

**`BloscZarrNodeOptions` interface:**

|      Property      |    Type   | Description                                  |
| :----------------: | :-------: | :------------------------------------------- |
|    `decompress`    | *boolean* | Decompress instead of compress               |
|    `outputSize`    |  *number* | Output binary size in bytes                  |
| `compressionLevel` |  *number* | Compression level in compression, 0 to 9     |
|     `typesize`     |  *number* | Assumed type size in compression             |
|     `noShuffle`    | *boolean* | Do not add bitshuffle support in compression |
|      `verbose`     | *boolean* | Output status information                    |

**`BloscZarrNodeResult` interface:**

| Property | Type | Description |
| :------: | :--: | :---------- |
