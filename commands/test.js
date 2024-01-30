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
  const results = [];

  readFiles(directory, (filename, content) => {
    if (filename.endsWith('.html')) {
      const $ = cheerio.load(content);
      const forms = $('form');
      let formCheck = true;

      forms.each((i, form) => {
        if ($(form).find('input[type="checkbox"]').length === 0) {
          formCheck = false;
          results.push(`Форма без чекбокса найдена в файле: ${filename}`);
        }
      });

      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content');

      if (titles.has(title) || descriptions.has(description)) {
        results.push(`Дублированные мета теги найдены в файле: ${filename}`);
      } else {
        titles.add(title);
        descriptions.add(description);
      }

      if (filename.endsWith('.html')) {
        const $ = cheerio.load(content);
        const links = $('a');

        links.each((i, link) => {
          const href = $(link).attr('href');
          if (href) {
            if (href === '#' || href === '') {
              results.push(
                `Недопустимая ссылка (href="${href}") обнаружена в файле: ${filename}`
              );
            } else if (
              !href.includes('http') &&
              !href.includes('tel:') &&
              !href.includes('mailto') &&
              !href.endsWith('.html')
            ) {
              results.push(
                `Недопустимая ссылка (href: ${href}) обнаружена в файле: ${filename}`
              );
            }
          }
        });
      }
    }
  });

  results.push('Сканирование завершено');

  console.log(results.join(','));
}

function unpackAndCheckZip(zipFilePath) {
  const zip = new AdmZip(zipFilePath);
  const extractPath = path.join(__dirname, 'temp_extracted');

  zip.extractAllTo(extractPath, true);

  checkHtmlFiles(extractPath);

  fs.rmdirSync(extractPath, { recursive: true });

  fs.unlinkSync(zipFilePath);
}

function findZipFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter(file => path.extname(file) === '.zip');
}

function processZipFiles(directory) {
  const zipFiles = findZipFiles(directory);

  zipFiles.forEach(zipFile => {
    const zipFilePath = path.join(directory, zipFile);
    unpackAndCheckZip(zipFilePath);
  });
}

const directory = path.join(__dirname);
processZipFiles(directory);
