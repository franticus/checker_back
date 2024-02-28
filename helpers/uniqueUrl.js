const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

async function downloadSitePagesAsZip(siteUrl) {
  // Асинхронно получаем путь к исполняемому файлу
  const executablePath = await chromium.executablePath();
  console.log('executablePath:', executablePath);

  const browser = await puppeteer.launch({
    executablePath, // Теперь здесь будет строка с путём
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto(siteUrl, { waitUntil: 'networkidle2' });

  // Сбор ссылок на страницы сайта
  const urls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a'))
      .map(link => link.href)
      .filter(href => href.startsWith(window.location.origin));
  });

  // Уникальные URL для избежания дубликатов
  const uniqueUrls = [...new Set(urls)];

  const zip = new JSZip();
  for (const url of uniqueUrls) {
    const pageContent = await downloadPageContent(url, browser);
    // Извлечение имени страницы из URL и сохранение контента в ZIP
    const pageName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
    zip.file(pageName, pageContent);
  }

  await browser.close();

  // Генерация имени для ZIP-файла на основе доменного имени сайта
  const siteDomain = new URL(siteUrl).hostname
    .replace(/^www\./, '')
    .split('.')[0];
  const zipName = `${siteDomain}.zip`;
  const outputPath = path.join(__dirname, '..', 'uploads', zipName);

  // Сохранение ZIP-архива
  const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(outputPath, zipContent);

  console.log(`Страницы сайта сохранены в ${outputPath}`);
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
