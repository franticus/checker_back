const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');

const emailAddresses = new Set();
const phoneNumbers = new Set();

async function processHtmlFile(
  filename,
  content,
  results,
  titles,
  descriptions
) {
  const $ = cheerio.load(content);
  const forms = $('form');
  let formCheck = true;

  $('a[href^="mailto:"]').each((i, el) => {
    const email = $(el).attr('href').slice(7).toLowerCase();
    emailAddresses.add(email);
  });

  $('a[href^="tel:"]').each((i, el) => {
    const phone = $(el).attr('href').slice(4).toLowerCase();
    phoneNumbers.add(phone);
  });

  $('a[href^="mailto:"]').each((i, el) => {
    const emailHref = $(el).attr('href').slice(7).toLowerCase();

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    let emailTextMatch = $(el).text().toLowerCase().match(emailRegex);
    let emailText = emailTextMatch ? emailTextMatch[0].toLowerCase() : '';

    if (!emailTextMatch || !emailTextMatch.includes(emailHref)) {
      const childEmailsText = $(el)
        .find('*')
        .map((i, child) => $(child).text().toLowerCase())
        .get()
        .join(' ');
      let childEmailMatch = childEmailsText.match(emailRegex);
      emailText = childEmailMatch
        ? childEmailMatch[0].toLowerCase()
        : emailText;
    }

    emailAddresses.add(emailHref);

    if (emailHref !== emailText) {
      results.push(
        `Разные email адреса в ${filename}: ${emailText} | ${emailHref}`
      );
    }
  });

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
          results.push(`Отсутствует атрибут name у input в файле: ${filename}`);
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

  const h1Tags = $('h1');
  if (h1Tags.length !== 1) {
    results.push(`Найдено ${h1Tags.length} тегов h1 в файле: ${filename}`);
  }

  if (filename.endsWith('.html')) {
    const links = $('a');

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const href = $(link).attr('href');
      if (href === '' || href === undefined) {
        results.push(
          `Недопустимая ссылка (пустая или отсутствует) (${href}) обнаружена в файле: ${filename}`
        );
        continue;
      }
      if (href) {
        if (
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

  if (filename.endsWith('.html')) {
    const links = $('a[href^="#"]');
    links.each((i, link) => {
      const href = $(link).attr('href');
      if (href.length > 1) {
        const anchorId = href.substring(1);
        const target = $(`#${anchorId}`);
        if (target.length === 0) {
          results.push(
            `Отсутствует якорь для ссылки ${href} в файле: ${filename}`
          );
        }
      }
    });
  }
}

async function checkHtmlFiles(directory, zipFileName = '') {
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

async function unpackAndCheckZip(zipFilePath) {
  const zip = new AdmZip(zipFilePath);
  const extractPath = path.join(__dirname, 'temp_extracted');
  const zipFileName = path.basename(zipFilePath);

  zip.extractAllTo(extractPath, true);

  await checkHtmlFiles(extractPath, zipFileName);

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
