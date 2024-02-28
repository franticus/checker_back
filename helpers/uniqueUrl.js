const puppeteer = require('puppeteer');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function downloadSitePagesAsZip(siteUrl) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(siteUrl, { waitUntil: 'networkidle2' });

  // Сбор ссылок на страницы сайта.
  const urls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(link => link.href)
      .filter(href => href.startsWith(window.location.origin));
  });

  // Уникальные URL для избежания дубликатов.
  const uniqueUrls = [...new Set(urls)];

  const zip = new JSZip();
  for (const url of uniqueUrls) {
    const pageContent = await downloadPageContent(url, browser);
    // Извлечение имени страницы из URL и сохранение контента в ZIP.
    const pageName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
    zip.file(pageName, pageContent);
  }

  await browser.close();

  // Генерация имени для ZIP-файла на основе доменного имени сайта.
  const siteDomain = new URL(siteUrl).hostname
    .replace(/^www\./, '')
    .split('.')[0]; // Удаление www и взятие домена первого уровня
  const zipName = `${siteDomain}.zip`; // Фиксированное имя файла
  const outputPath = path.join(__dirname, '..', 'uploads', zipName);

  // Сохранение ZIP-архива.
  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, zipContent);

  console.log(`Страницы сайта сохранены в ${outputPath}`);
  // Возвращаем путь к созданному ZIP-файлу.
  return outputPath;
}

async function downloadPageContent(url, browser) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const content = await page.content();
  await page.close();
  return content;
}

module.exports = downloadSitePagesAsZip;
