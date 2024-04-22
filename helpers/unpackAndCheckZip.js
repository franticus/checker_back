const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const checkHtmlFiles = require('./checkHtmlFiles');
const checkCssFiles = require('./checkCssFiles');

async function unpackAndCheckZip(zipFilePath) {
  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();
  const extractPath = path.join(__dirname, '..', 'temp_extracted');
  const zipFileName = path.basename(zipFilePath);

  let allFilesInOneFolder = true;
  let filesAtRoot = false;

  zipEntries.forEach(entry => {
    const entryPathSegments = entry.entryName
      .split('/')
      .filter(segment => segment.trim().length > 0);

    if (!entry.isDirectory && entryPathSegments.length === 1) {
      filesAtRoot = true;
    }

    if (
      entryPathSegments.length > 2 ||
      (entryPathSegments.length === 1 && !entry.isDirectory)
    ) {
      allFilesInOneFolder = false;
    }
  });

  if (!filesAtRoot || allFilesInOneFolder) {
    console.error(
      'Архив не должен содержать папку. Пожалуйста, упакуйте файлы непосредственно в корень архива.'
    );
    return;
  }

  zip.extractAllTo(extractPath, true);
  await checkHtmlFiles(extractPath, zipFileName);
  await checkCssFiles(extractPath, zipFileName);

  await fs.remove(extractPath);
  await fs.unlink(zipFilePath);
}

module.exports = unpackAndCheckZip;
