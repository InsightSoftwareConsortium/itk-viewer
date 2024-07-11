
export function bloscZarrDecompress(chunkData: Array<{data: ArrayBuffer, metadata: any}>): Promise<Array<ArrayBuffer>>;

export function getPipelinesBaseUrl(): string;
export function setPipelinesBaseUrl(url: string): void;
export function getPipelineWorkerUrl(): string;
export function setPipelineWorkerUrl(url: string): void;