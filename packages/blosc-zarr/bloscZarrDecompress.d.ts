
export function bloscZarrDecompress(chunkData: Array<{data: ArrayBuffer, metadata: any}>): Promise<Array<ArrayBuffer>>;