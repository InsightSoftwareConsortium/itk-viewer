#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';
import svgToMiniDataURI from 'mini-svg-data-uri';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  fs.mkdirSync('dist');
} catch (err) {
  if (err.code !== 'EEXIST') throw err;
}

const svgFiles = glob.sync(path.join('src', '*.svg'));
const icons = new Map();
svgFiles.forEach((svgFile) => {
  const contents = fs.readFileSync(svgFile, { encoding: 'utf8', flag: 'r' });
  const optimizedSVGDataURI = svgToMiniDataURI(contents);
  const moduleContents = `const optimizedSVGDataUri = "${optimizedSVGDataURI}"

export default optimizedSVGDataUri
`;
  const basename = path.basename(svgFile, '.svg');
  icons.set(`${basename}IconDataUri`, {
    modulePath: `./${basename}.svg.uri.js`,
    svgFile,
  });
  fs.writeFileSync(path.join('dist', `${basename}.svg.uri.js`), moduleContents);
});

const indexFile = path.join('dist', 'index.js');
const indexFD = fs.openSync(indexFile, 'w');
for (const [varName, { modulePath }] of icons) {
  fs.writeSync(
    indexFD,
    `export { default as ${varName} } from "${modulePath}"\n`,
  );
}
fs.closeSync(indexFD);

const readmeContents = fs.readFileSync(path.join(__dirname, 'README.md.in'), {
  encoding: 'utf8',
  flag: 'r',
});
const readmeFD = fs.openSync(path.join(__dirname, 'README.md'), 'w');
fs.writeSync(readmeFD, readmeContents);

fs.writeSync(readmeFD, '<table>\n');
for (const [varName, { svgFile }] of icons) {
  fs.writeSync(readmeFD, '  <tr>\n');
  fs.writeSync(readmeFD, `    <th>${varName}</th>\n`);
  fs.writeSync(
    readmeFD,
    `    <th><img src="${svgFile}" width="40" alt="${varName}"/></th>\n`,
  );
  fs.writeSync(readmeFD, '  </tr>\n');
}
fs.writeSync(readmeFD, '</table>\n');
