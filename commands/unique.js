const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const stopwords = require('stopword');
const checkedArchiveDir = path.join(__dirname, '..', 'checkedArchive');

function preprocessText(text) {
  let words = text.toLowerCase().split(/\s+/);
  words = words.map(word => word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''));
  words = stopwords.removeStopwords(words); // Удаление стоп-слов
  return words;
}

function compareText(text1, text2) {
  const words1 = preprocessText(text1);
  const words2 = preprocessText(text2);

  const text1Words = new Set(words1);
  const text2Words = new Set(words2);

  const commonWords = new Set(
    [...text1Words].filter(word => text2Words.has(word))
  );
  const allUniqueWords = new Set([...text1Words, ...text2Words]);

  // Исправленный расчет уникального процента
  const uniquePercentage =
    ((allUniqueWords.size - commonWords.size) / allUniqueWords.size) * 100;

  return Math.floor(uniquePercentage.toFixed(2));
}

function compareWithCheckedArchive(newText) {
  const files = fs.readdirSync(checkedArchiveDir);
  const results = [];

  files.forEach(file => {
    // Игнорируем скрытые файлы и файлы с записями "._"
    if (!file.startsWith('.') && !file.startsWith('._')) {
      const filePath = path.join(checkedArchiveDir, file);
      try {
        const jsonContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (jsonContent && jsonContent.name && jsonContent.pages) {
          const combinedText = Object.values(jsonContent.pages).join(' ');
          const uniquePercentage = compareText(newText, combinedText);
          results.push({
            name: jsonContent.name,
            uniquePercentage: uniquePercentage,
          });
        } else {
          console.error(`Invalid JSON format in file: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error);
      }
    }
  });

  const outputFilePath = path.join(__dirname, '..', 'comparisonResults.json');
  fs.writeFileSync(outputFilePath, JSON.stringify(results, null, 2));
  console.log(`Comparison results saved to ${outputFilePath}`);

  return results;
}

async function unpackAndSavePlainText(filePath, originalFileName) {
  const zip = new AdmZip(filePath);
  const zipEntries = zip.getEntries();

  // Получаем имя архива без расширения
  const archiveName = path.basename(
    originalFileName,
    path.extname(originalFileName)
  );

  // Создаем объект для хранения информации о каждой странице
  const siteData = {
    name: archiveName,
    pages: {},
    date: new Date().toISOString(),
  };

  for (const entry of zipEntries) {
    if (entry.entryName.endsWith('.html')) {
      // Проверяем, что ключ не начинается с "._"
      if (!entry.entryName.startsWith('._')) {
        const content = zip.readAsText(entry);
        const plainText = stripTags(content);
        const pageName = path.basename(entry.entryName, '.html');
        siteData.pages[pageName] = plainText; // Сохраняем текст страницы в объект
      }
    }
  }

  // Удаляем все ключи из объекта, начинающиеся с "._"
  Object.keys(siteData.pages).forEach(key => {
    if (key.startsWith('._')) {
      delete siteData.pages[key];
    }
  });

  // Создаем JSON файл и записываем в него данные
  const jsonFileName = archiveName + '.json'; // Используем имя архива без расширения для JSON файла
  const jsonFilePath = path.join(checkedArchiveDir, jsonFileName);
  fs.writeFileSync(jsonFilePath, JSON.stringify(siteData, null, 2));
  console.log(`JSON file for ${siteData.name} saved to ${jsonFilePath}`);

  // Очистка папки uploads после обработки файла
  fs.unlinkSync(filePath);

  // Возвращаем новый текст для сравнения
  return Object.values(siteData.pages).join('');
}

function stripTags(html) {
  // Удаляем HTML теги
  let plainText = html.replace(/<[^>]*>?/gm, '');
  // Удаляем пустые строки и лишние пробелы
  plainText = plainText.replace(/\s+/g, ' ').trim(); // Удаляем лишние пробелы и обрезаем пробелы в начале и конце строки
  return plainText;
}

module.exports = {
  compareText,
  compareWithCheckedArchive,
  unpackAndSavePlainText,
};
