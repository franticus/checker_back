const cheerio = require('cheerio');
const emailAddresses = new Set();
const phoneNumbers = new Set();
const fs = require('fs-extra');
const path = require('path');

async function processHtmlFile(
  filename,
  content,
  results,
  titles,
  descriptions,
  extractPath
) {
  const $ = cheerio.load(content);
  const forms = $('form');
  let formCheck = true;

  let imageExistencePromises = [];

  $('img').each((i, el) => {
    const imgSrc = $(el).attr('src');
    if (imgSrc) {
      const imgPath = path.join(extractPath, imgSrc);
      imageExistencePromises.push(
        fs
          .access(imgPath)
          .then(() => null)
          .catch(
            () =>
              `Несуществующий файл изображения "${imgSrc}" в файле: ${filename}`
          )
      );
    }
  });

  const imageErrors = await Promise.all(imageExistencePromises);
  imageErrors
    .filter(error => error !== null)
    .forEach(error => results.push(error));

  $('img[src^="./"], script[src^="./"], link[href^="./"]').each((i, el) => {
    const srcOrHref = $(el).attr('src') || $(el).attr('href');
    results.push(`Недопустимый путь ("./"): ${srcOrHref} в файле: ${filename}`);
  });

  $('img').each((i, el) => {
    const altText = $(el).attr('alt');
    const imgSrc = $(el).attr('src') || 'неизвестный источник';
    if (typeof altText === 'undefined') {
      results.push(
        `Отсутствует атрибут alt у изображения "${imgSrc}" в файле: ${filename}`
      );
    }
  });

  $('a[href^="mailto:"]').each((i, el) => {
    const email = $(el).attr('href').slice(7).toLowerCase();
    emailAddresses.add(email);
  });

  $('a[href^="tel:"]').each((i, el) => {
    const phoneRaw = $(el).attr('href').slice(4).toLowerCase();
    const phone = phoneRaw.replace(/[^\d]/g, '');
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
      if (href === '' || href === undefined || href === '#') {
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

module.exports = {
  processHtmlFile,
  emailAddresses,
  phoneNumbers,
};
