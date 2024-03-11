const fs = require('fs-extra');
const path = require('path');

const checkedArchiveDir = path.join(__dirname, '..', 'checkedArchive');

async function cleanNonNewFilesHandler(req, res) {
  try {
    const files = await fs.readdir(checkedArchiveDir);

    for (const file of files) {
      if (!file.toLowerCase().startsWith('new_v')) {
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
