const fs = require('fs-extra');
const path = require('path');
const postcss = require('postcss');
const urlPlugin = require('postcss-url');

async function checkCssFiles(directory) {
  const files = await fs.readdir(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = await fs.stat(filePath);

    if (file.startsWith('._') || filePath.includes('__MACOSX')) {
      continue;
    }

    if (stat.isFile() && file.endsWith('.css')) {
      const cssContent = await fs.readFile(filePath, 'utf8');
      await analyzeCss(filePath, cssContent, directory);
    } else if (stat.isDirectory()) {
      await checkCssFiles(filePath);
    }
  }
}

async function analyzeCss(filePath, cssContent, baseDirectory) {
  let errors = [];

  await postcss([
    urlPlugin({
      url: (asset, dir) => {
        let url = asset.url;
        if (url.startsWith('http') || url.startsWith('https')) {
          errors.push(`Недопустимая внешняя ссылка: ${url}`);
          return url;
        }

        const fullPath = path.resolve(dir.to, url);
        if (!fs.existsSync(fullPath)) {
          errors.push(`Недопустимая ссылка на файл: ${url} в css`);
        }

        return url;
      },
    }),
  ])
    .process(cssContent, { from: filePath })
    .catch(error => {
      errors.push(`Ошибка при обработке CSS: ${error.toString()}`);
    });

  if (errors.length > 0) {
    errors.forEach(error => console.error(error));
  }
}

module.exports = checkCssFiles;
