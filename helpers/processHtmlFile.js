const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const emailAddresses = new Set();
const phoneNumbers = new Set();

async function processHtmlFile(
  filename,
  content,
  results,
  titles,
  descriptions,
  extractPath
) {
  const $ = cheerio.load(content);
  const checkPromises = [];

  // Проверка ссылок
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    if (href.startsWith('#')) {
      if (href.length > 1 && !$(href).length) {
        results.push(`Якорь "${href}" не найден в документе: ${filename}`);
      }
    } else if (href.includes('.html#')) {
      const [page, anchor] = href.split('#');
      const pagePath = path.join(extractPath, page);
      checkPromises.push(checkAnchor(pagePath, anchor, filename));
    } else if (href.endsWith('.html')) {
      const pagePath = path.join(extractPath, href);
      checkPromises.push(checkPageExists(pagePath, filename));
    }
  });

  // Проверка изображений
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    if (!src) return;
    const imgPath = path.join(extractPath, src);
    checkPromises.push(
      checkFileExists(
        imgPath,
        `Изображение "${src}" не найдено в файле: ${filename}`
      )
    );
  });

  const errors = await Promise.all(checkPromises);
  errors.filter(e => e).forEach(error => results.push(error));

  // Дополнительные проверки для изображений
  $('img').each((i, el) => {
    const src = $(el).attr('src');
    const alt = $(el).attr('alt');
    if (!alt) {
      results.push(
        `Отсутствует атрибут alt у изображения "${src}" в файле: ${filename}`
      );
    }
  });

  // Проверка форм
  $('form').each((i, form) => {
    const action = $(form).attr('action');
    if (!action || !action.endsWith('.php')) {
      results.push(
        `Отсутствует или некорректный атрибут action у формы в файле: ${filename}`
      );
    }

    const checkboxes = $(form).find('input[type="checkbox"]');
    if (checkboxes.length === 0) {
      results.push(`Форма без чекбокса найдена в файле: ${filename}`);
    }
  });

  // Проверка заголовков и мета-тегов
  const title = $('title').text();
  const description = $('meta[name="description"]').attr('content');
  if (titles.has(title) || descriptions.has(description)) {
    results.push(`Дублированные мета теги найдены в файле: ${filename}`);
  } else {
    titles.add(title);
    descriptions.add(description);
  }

  // Проверка количества тегов h1
  const h1Tags = $('h1');
  if (h1Tags.length !== 1) {
    results.push(`Найдено ${h1Tags.length} тегов h1 в файле: ${filename}`);
  }
}

// Вспомогательные функции для асинхронной проверки
async function checkAnchor(pagePath, anchor, originFile) {
  try {
    const pageContent = await fs.readFile(pagePath, 'utf-8');
    const $page = cheerio.load(pageContent);
    return !$page(`#${anchor}`).length
      ? `Якорь "#${anchor}" не найден на странице "${pagePath}" в документе: ${originFile}`
      : null;
  } catch (err) {
    return `Ошибка при чтении страницы "${pagePath}": ${err.message}`;
  }
}

async function checkPageExists(pagePath, originFile) {
  try {
    await fs.access(pagePath);
    return null;
  } catch (err) {
    return `Ссылка на несуществующую страницу "${pagePath}" в документе: ${originFile}`;
  }
}

async function checkFileExists(filePath, errorMessage) {
  try {
    await fs.access(filePath);
    return null;
  } catch (err) {
    return errorMessage;
  }
}

module.exports = {
  processHtmlFile,
  emailAddresses,
  phoneNumbers,
};
