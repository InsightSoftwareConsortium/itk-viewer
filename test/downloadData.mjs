import { testDataCid, testDataDir, downloadData } from './data.mjs'
import { dirname } from 'path'
import fs from 'fs'

if (!fs.existsSync(testDataDir)) {
  console.log('Test data not found. Downloading...')
  await downloadData(testDataCid, testDataDir)
} else {
  console.log('Test data found.')
}
