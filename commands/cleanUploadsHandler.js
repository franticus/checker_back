const fs = require('fs-extra');
const path = require('path');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const tempExtractedDir = path.join(__dirname, '..', 'temp_extracted');

async function cleanUploads(req, res) {
  try {
    await fs.emptyDir(uploadsDir);
    await fs.remove(tempExtractedDir);
    res.send(
      'Uploads and temporary extraction directories have been cleared successfully.'
    );
  } catch (error) {
    console.error('Error clearing directories:', error);
    res.status(500).send('Error clearing directories');
  }
}

module.exports = cleanUploads;
