const fs = require('fs-extra');
const path = require('path');

async function clearUploadsDirectory(directory) {
  try {
    const files = await fs.readdir(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      await fs.remove(filePath);
    }
  } catch (error) {
    console.error('Ошибка при очистке папки uploads:', error);
  }
}

module.exports = clearUploadsDirectory;
