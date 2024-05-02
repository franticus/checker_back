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
    if (href.startsWith('#') && href.length > 1) {
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
  $('link[rel="icon"], link[rel="shortcut icon"]').each(async (i, elem) => {
    const href = $(elem).attr('href');
    const faviconPath = path.join(
      extractPath,
      href.startsWith('/') ? href.slice(1) : href
    );

    try {
      await fs.promises.access(faviconPath);
    } catch (err) {
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
      const emailAddress = href.substring(7); // Убираем 'mailto:'
      if (!emailAddress.endsWith('@gmail.com')) {
        results.push(
          `Недопустимый email адрес '${emailAddress}' в документе: ${filename}`
        );
      }
      emailAddresses.add(emailAddress); // Добавляем в набор для учёта всех найденных email
    }
  });

  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

  // Функция для проверки и добавления email адресов
  function checkAndAddEmail(email, source, results) {
    if (!email.endsWith('@gmail.com')) {
      results.push(
        `Недопустимый email адрес '${email}' в документе: ${source}`
      );
    }
    emailAddresses.add(email);
  }

  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('mailto:')) {
      const emailAddress = href.substring(7);
      checkAndAddEmail(emailAddress, `ссылка ${href}`, results);
    }
    // Поиск в href
    const emailsInHref = href && href.match(emailPattern);
    if (emailsInHref) {
      emailsInHref.forEach(email =>
        checkAndAddEmail(email, `ссылка ${href}`, results)
      );
    }
  });

  // Поиск в тексте страницы
  const text = $('body').text();
  const emailsInText = text.match(emailPattern);
  if (emailsInText) {
    emailsInText.forEach(email =>
      checkAndAddEmail(email, 'текст страницы', results)
    );
  }

  // Поиск во всех атрибутах, исключая элементы input
  $('*:not(input)').each((i, el) => {
    Object.entries(el.attribs).forEach(([attrName, attrValue]) => {
      // Исключаем атрибуты placeholder у всех элементов
      if (attrName === 'placeholder') return;

      const emailsInAttr = attrValue.match(emailPattern);
      if (emailsInAttr) {
        emailsInAttr.forEach(email => {
          checkAndAddEmail(
            email,
            `атрибут ${attrName} элемента ${el.tagName}`,
            results
          );
        });
      }
    });
  });

  // Проверка уникальности и правильности формата email после сбора всех адресов
  if (emailAddresses.size > 0) {
    const allEmails = Array.from(emailAddresses);
    const uniqueEmail = allEmails[0];
    if (allEmails.every(email => email === uniqueEmail)) {
      if (!uniqueEmail.endsWith('@gmail.com')) {
        results.push(
          `Используемый email адрес '${uniqueEmail}' не заканчивается на '@gmail.com'.`
        );
      }
    }
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
