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

  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return; // Если href не существует, пропускаем

    // Проверка на якорные ссылки внутри той же страницы
    if (href.startsWith('#')) {
      if (href.length > 1 && !$(href).length) {
        results.push(`Якорь "${href}" не найден в документе: ${filename}`);
      }
      // Проверка на внутренние ссылки с якорями
    } else if (href.includes('.html#')) {
      const [page, anchor] = href.split('#');
      const pagePath = path.join(extractPath, page);
      checkPromises.push(checkAnchor(pagePath, anchor, filename));
      // Проверка на внутренние ссылки на другие HTML страницы
    } else if (href.endsWith('.html')) {
      const pagePath = path.join(extractPath, href);
      checkPromises.push(checkPageExists(pagePath, filename));
      // Проверка на допустимые внешние ссылки, исключая Google Maps
    } else if (
      (href.startsWith('http://') || href.startsWith('https://')) &&
      !href.includes('google.com/maps') &&
      !href.startsWith('https://maps.app.goo.gl')
    ) {
      results.push(
        `Недопустимая внешняя ссылка: ${href} в документе: ${filename}`
      );
      // Проверка на недопустимые пути ссылок
    } else if (href.startsWith('/') || href === '#') {
      // Проверяем, что это не просто корневой путь или заглушка
      if (href === '/' || href === '#') {
        results.push(
          `Недопустимая ссылка-заглушка: ${href} в документе: ${filename}`
        );
      } else {
        // Проверяем, что ссылка ведет на существующую страницу или ID
        const pagePath = path.join(extractPath, href);
        checkPromises.push(checkPageExists(pagePath, filename));
      }
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

  // Дополнительные проверки для favicon
  $('link[rel="icon"]').each((i, elem) => {
    const href = $(elem).attr('href');
    const faviconPath = path.resolve(
      extractPath,
      href.startsWith('/') ? href.slice(1) : href
    );

    if (!fs.existsSync(faviconPath)) {
      results.push(`Отсутствует файл favicon: ${href} в файле ${filename}`);
    }
  });

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

  // Проверка email
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('mailto:')) {
      const emailAddress = href.substring(7); // Вырезаем 'mailto:'
      if (!emailAddress.endsWith('@gmail.com')) {
        results.push(
          `Недопустимый email адрес '${emailAddress}' в документе: ${filename}`
        );
      }
      emailAddresses.add(emailAddress); // Добавляем в набор для учета всех найденных email
    }
  });

  // Проверка, что используется только один email адрес на всех страницах
  if (emailAddresses.size > 1) {
  } else if (emailAddresses.size === 1) {
    const commonEmail = emailAddresses.values().next().value;
    if (!commonEmail.endsWith('@gmail.com')) {
      results.push(
        `Используемый email адрес '${commonEmail}' не заканчивается на @gmail.com.`
      );
    }
  } else {
    results.push(`Не найдено ни одного email адреса в проекте.`);
  }

  // Проверка наличия тега <main>
  const mainExists = $('main').length > 0;
  if (!mainExists) {
    results.push(`Отсутствует тег <main> в файле: ${filename}`);
  }

  // Проверка наличия тега <title> и мета-тега <meta name="description">
  const title = $('title').text().trim();
  const description = $('meta[name="description"]').attr('content')?.trim();

  if (!title) {
    results.push(`Отсутствует тег <title> или он пуст в файле: ${filename}`);
  } else {
    if (titles.has(title)) {
      results.push(`Дублированный тег <title> найден в файле: ${filename}`);
    } else {
      titles.add(title);
    }
  }

  if (!description) {
    results.push(
      `Отсутствует мета-тег <meta name="description"> или он пуст в файле: ${filename}`
    );
  } else {
    if (descriptions.has(description)) {
      results.push(
        `Дублированный мета-тег <meta name="description"> найден в файле: ${filename}`
      );
    } else {
      descriptions.add(description);
    }
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
