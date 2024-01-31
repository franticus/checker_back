const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');

async function checkHtmlFiles(directory) {
  const titles = new Set();
  const descriptions = new Set();
  const results = [];

  async function processFile(filename, content) {
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

      $('form').each((i, form) => {
        const action = $(form).attr('action');
        if (!action || !action.endsWith('.php')) {
          results.push(
            `Отсутствует или некорректный атрибут action у формы в файле: ${filename}`
          );
        }

        $(form)
          .find('input:not([type="submit"])')
          .each((j, input) => {
            const inputElement = $(input);
            const hasRequired =
              inputElement.attr('required') === '' ||
              inputElement.attr('required') === 'required';

            if (!hasRequired) {
              results.push(
                `Отсутствует атрибут required у input в файле: ${filename}`
              );
            }

            const hasName = inputElement.attr('name') !== undefined;

            if (!hasName) {
              results.push(
                `Отсутствует атрибут name у input в файле: ${filename}`
              );
            }
          });

        const textareaStyle = $(form).find('textarea').attr('style');
        if (textareaStyle && !textareaStyle.includes('resize: none')) {
          results.push(
            `У textarea отсутствует свойство resize: none в файле: ${filename}`
          );
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

        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          const href = $(link).attr('href');
          if (href) {
            if (
              href === '' ||
              href.startsWith('#') ||
              href.endsWith('.html') ||
              href.includes('#')
            ) {
              continue;
            } else if (
              !href.includes('http') &&
              !href.includes('tel:') &&
              !href.includes('mailto')
            ) {
              results.push(
                `Недопустимая ссылка (href: ${href}) обнаружена в файле: ${filename}`
              );
            }
          }
        }
      }
    }
  }

  const filterHiddenFiles = file => !file.startsWith('.');
  const files = (await fs.readdir(directory)).filter(filterHiddenFiles);

  for (const filename of files) {
    const filePath = path.join(directory, filename);
    const stat = await fs.stat(filePath);

    if (stat.isFile()) {
      const content = await fs.readFile(filePath, 'utf-8');
      await processFile(filename, content);
    } else if (stat.isDirectory()) {
      await checkHtmlFiles(filePath);
    }
  }

  console.log(
    results
      .map(result => result.trim())
      .filter(result => result !== '')
      .join(', ')
  );
}

async function unpackAndCheckZip(zipFilePath) {
  const zip = new AdmZip(zipFilePath);
  const extractPath = path.join(__dirname, 'temp_extracted');

  zip.extractAllTo(extractPath, true);

  await checkHtmlFiles(extractPath);

  await fs.remove(extractPath);
  await fs.unlink(zipFilePath);
}

async function processZipFiles(directory) {
  const files = await fs.readdir(directory);
  const zipFiles = files.filter(file => path.extname(file) === '.zip');

  for (const zipFile of zipFiles) {
    const zipFilePath = path.join(directory, zipFile);
    await unpackAndCheckZip(zipFilePath);
  }
}

const directory = path.join(__dirname);
processZipFiles(directory);
