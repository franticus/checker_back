const fs = require('fs-extra');
const path = require('path');

const checkedArchiveDir = path.join(__dirname, '..', 'checkedArchive');

async function cleanNonNewFilesHandler(req, res) {
  try {
    const files = await fs.readdir(checkedArchiveDir);

    // Регулярное выражение, которое соответствует только английским буквам, цифрам, '_', '-', '.'
    const englishAlphabetAndSymbolsRegex = /^[a-zA-Z0-9_.\-]+$/;

    for (const file of files) {
      // Проверяем, содержит ли название файла только английские буквы, цифры, '_', '-', '.'
      if (!englishAlphabetAndSymbolsRegex.test(file)) {
        await fs.unlink(path.join(checkedArchiveDir, file));
      }
    }

    res.send('Non-"New" files have been successfully deleted.');
  } catch (error) {
    console.error('Error processing the request:', error);
    res.status(500).send('Error processing the request.');
  }
}

module.exports = cleanNonNewFilesHandler;
