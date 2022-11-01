# itk-viewer

## Development

Contributions are welcome and appreciated.

To create a tarball of the current testing data:

```
cd test/data
# Here replace <cid> by the current data content identifier (CID)
mkdir -p staging
cp -a ./<cid>/* ./staging/
cd staging
tar cvf ../data.tar *
gzip -9 ../data.tar
```

Upload the data to [web3.storage](https://web3.storage). And update the `testDataCid` in test/data.js Content Identifier (CID) variable, which is available in the web3.storage web page interface.
