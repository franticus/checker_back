const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const checkHtmlFiles = require('./checkHtmlFiles');

async function unpackAndCheckZip(zipFilePath) {
  const zip = new AdmZip(zipFilePath);
  const extractPath = path.join(__dirname, 'temp_extracted');
  const zipFileName = path.basename(zipFilePath);

  zip.extractAllTo(extractPath, true);

  await checkHtmlFiles(extractPath, zipFileName);

  await fs.remove(extractPath);
  await fs.unlink(zipFilePath);
}

module.exports = unpackAndCheckZip;
