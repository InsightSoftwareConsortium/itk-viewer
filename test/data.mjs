import path from 'path';
import { fileURLToPath } from 'url';
import tar from 'tar';
import fs from 'fs';
import followRedirects from 'follow-redirects';
import zlib from 'zlib';

const testDataCid =
  'bafybeibjcayqjpncn7zxw7grbvov27humumuv5uraozgd2gni2l4xv6ztm';
export { testDataCid };

const testDir = path.dirname(fileURLToPath(import.meta.url));

const testDataDir = path.join(testDir, 'data');
export { testDataDir };

async function downloadData() {
  const fetchCompleteFile = path.join(testDataDir, '.fetch-complete');
  if (fs.existsSync(fetchCompleteFile)) {
    console.log('Test data found.');
    return;
  }
  try {
    fs.mkdirSync(testDataDir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }

  const url = `https://${testDataCid}.ipfs.w3s.link/ipfs/${testDataCid}/data.tar.gz`;
  const request = followRedirects.https.get(url, function (response) {
    response
      .pipe(zlib.Unzip())
      .pipe(tar.x({ C: testDataDir }))
      .on('end', () => {
        fs.closeSync(fs.openSync(fetchCompleteFile, 'w'));
      })
      .on('error', (err) => {
        console.error(err);
      });
  });
}

export { downloadData };
