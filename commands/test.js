const fs = require('fs-extra');
const path = require('path');

const unpackAndCheckZip = require('../helpers/unpackAndCheckZip');
const clearUploadsDirectory = require('../helpers/clearUploadsDirectory');

const uploads = path.join(__dirname, '..', 'uploads');

async function processZipFiles(uploads) {
  const files = await fs.readdir(uploads);
  const zipFiles = files.filter(
    file => path.extname(file).toLowerCase() === '.zip'
  );

  if (zipFiles.length === 0) {
    console.error('Нет ZIP-файлов для обработки');
    return { error: 'Отправленный файл не является ZIP-архивом' };
  }

  for (const zipFile of zipFiles) {
    const zipFilePath = path.join(uploads, zipFile);
    await unpackAndCheckZip(zipFilePath);
  }

  await clearUploadsDirectory(uploads);
}

processZipFiles(uploads);
