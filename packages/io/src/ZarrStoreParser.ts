interface Store {
  getItem: (key: string) => Promise<ArrayBuffer>;
}

const isMetadata = (item: string) =>
  ['.zattrs', '.zgroup', '.zarray'].some((knownMetadataFile) =>
    item.endsWith(knownMetadataFile),
  );

export class ZarrStoreParser implements Store {
  store: Store;
  decoder: TextDecoder;
  constructor(store: Store) {
    this.store = store;
    this.decoder = new TextDecoder();
  }

  toJson(data: ArrayBuffer) {
    return JSON.parse(this.decoder.decode(data));
  }

  async getItem(item: string) {
    const data = await this.store.getItem(item);
    return isMetadata(item) ? this.toJson(data) : data;
  }
}
