const fs = require('fs-extra');
const path = require('path');
const uploadsDir = path.join(__dirname, '..', 'uploads');

async function cleanUploads(req, res) {
  try {
    await fs.emptyDir(uploadsDir);
    res.send('Uploads directory has been cleared successfully.');
  } catch (error) {
    console.error('Error clearing uploads directory:', error);
    res.status(500).send('Error clearing uploads directory');
  }
}

module.exports = cleanUploads;
