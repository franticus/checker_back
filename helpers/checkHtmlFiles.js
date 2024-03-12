const fs = require('fs-extra');
const path = require('path');
const {
  processHtmlFile,
  emailAddresses,
  phoneNumbers,
} = require('./processHtmlFile');

async function checkHtmlFiles(uploads, zipFileName = '') {
  const titles = new Set();
  const descriptions = new Set();
  const results = [];

  if (zipFileName) {
    results.push(`Проверка архива: ${zipFileName}`);
  }

  async function processFile(filename, content) {
    if (filename.endsWith('.html')) {
      await processHtmlFile(filename, content, results, titles, descriptions);
    }
  }

  const filterHiddenFiles = file => !file.startsWith('.');
  const files = (await fs.readdir(uploads)).filter(filterHiddenFiles);

  for (const filename of files) {
    const filePath = path.join(uploads, filename);
    const stat = await fs.stat(filePath);

    if (stat.isFile()) {
      const content = await fs.readFile(filePath, 'utf-8');
      await processFile(filename, content);
    } else if (stat.isDirectory()) {
      await checkHtmlFiles(filePath);
    }
  }

  if (emailAddresses.size > 1) {
    results.push(
      `Разные email адреса: ${Array.from(emailAddresses).join(', ')}`
    );
  }
  if (phoneNumbers.size > 1) {
    results.push(
      `Разные номера телефонов: ${Array.from(phoneNumbers).join(', ')}`
    );
  }

  console.log(
    results
      .map(result => result.trim())
      .filter(result => result !== '')
      .join(', ')
  );
}

module.exports = checkHtmlFiles;
