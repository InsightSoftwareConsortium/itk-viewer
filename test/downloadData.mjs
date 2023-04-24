import { testDataDir, downloadData } from './data.mjs';
import fs from 'fs';

if (!fs.existsSync(testDataDir)) {
  console.log('Test data not found. Downloading...');
  await downloadData();
} else {
  console.log('Test data found.');
}
