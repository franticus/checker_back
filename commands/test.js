const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');

function readFiles(directory, onFileContent) {
  fs.readdirSync(directory).forEach(filename => {
    const filePath = path.join(directory, filename);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const content = fs.readFileSync(filePath, 'utf-8');
      onFileContent(filename, content);
    } else if (stat.isDirectory()) {
      readFiles(filePath, onFileContent);
    }
  });
}

function checkHtmlFiles(directory) {
  const titles = new Set();
  const descriptions = new Set();

  readFiles(directory, (filename, content) => {
    if (filename.endsWith('.html')) {
      const $ = cheerio.load(content);
      const forms = $('form');
      let formCheck = true;

      forms.each((i, form) => {
        if ($(form).find('input[type="checkbox"]').length === 0) {
          formCheck = false;
          console.log(`Форма без чекбокса найдена в файле: ${filename}`);
        } else {
          console.log(`Формы без чекбокса отсутствуют`);
        }
      });

      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content');

      if (titles.has(title) || descriptions.has(description)) {
        console.log(`Дублированные мета теги найдены в файле: ${filename}`);
      } else {
        titles.add(title);
        descriptions.add(description);
      }
    }
  });
}

function unpackAndCheckZip(zipFilePath) {
  const zip = new AdmZip(zipFilePath);
  const extractPath = path.join(__dirname, 'temp_extracted');

  zip.extractAllTo(extractPath, true);
  console.log(`ZIP extracted to '${extractPath}'`);

  checkHtmlFiles(extractPath);

  fs.rmdirSync(extractPath, { recursive: true });
  console.log(`Extracted files removed from '${extractPath}'`);
}

const zipFilePath = './New_v9_LibraBooks.zip';
unpackAndCheckZip(zipFilePath);
