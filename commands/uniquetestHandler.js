const fs = require('fs-extra');
const path = require('path');
const {
  unpackAndSavePlainText,
  compareWithCheckedArchive,
} = require('./unique.js');
const clearUploadsDirectory = require('../helpers/clearUploadsDirectory.js');

async function uniqueTest(req, res, uploadsDir) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.path;
  const originalFileName = req.file.originalname;

  try {
    const newText = await unpackAndSavePlainText(filePath, originalFileName);
    const comparisonResults = compareWithCheckedArchive(newText);
    comparisonResults.sort((a, b) => a.uniquePercentage - b.uniquePercentage);

    const jsonFilePath = path.join(__dirname, '..', 'comparisonResults.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(comparisonResults, null, 2));

    res.json(comparisonResults);
  } catch (error) {
    console.error('Error processing the request:', error);
    await clearUploadsDirectory(uploadsDir);
    res
      .status(500)
      .json({ name: 'Internal Server Error', uniquePercentage: null });
  }
}

module.exports = uniqueTest;
