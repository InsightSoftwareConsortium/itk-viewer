interface BloscZarrOptions {
  /** Decompress instead of compress */
  decompress?: boolean

  /** Output binary size in bytes */
  outputSize?: number

  /** Compression level in compression, 0 to 9 */
  compressionLevel?: number

  /** Assumed type size in compression */
  typesize?: number

  /** Do not add bitshuffle support in compression */
  noShuffle?: boolean

  /** Output status information */
  verbose?: boolean

}

export default BloscZarrOptions
