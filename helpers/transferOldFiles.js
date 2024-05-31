const fs = require('fs-extra');
const path = require('path');

const checkedArchiveDir = path.resolve(__dirname, '..', 'checkedArchive');
const dataBaseCheckedArchiveDir = path.resolve(
  __dirname,
  '..',
  'dataBaseCheckedArchive'
);

function transferOldFiles() {
  // Убедитесь, что папка назначения существует
  fs.ensureDirSync(dataBaseCheckedArchiveDir);

  const files = fs.readdirSync(checkedArchiveDir);
  const currentDate = new Date();

  files.forEach(file => {
    const filePath = path.join(checkedArchiveDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fileDate = new Date(data.date);
    const twentyDaysAgo = new Date(
      currentDate.getTime() - 20 * 24 * 60 * 60 * 1000
    ); // 20 дней в миллисекундах

    // Проверка на наличие даты и корректность даты
    if (isNaN(fileDate.getTime()) || fileDate < twentyDaysAgo) {
      const newLocation = path.join(dataBaseCheckedArchiveDir, file);
      fs.renameSync(filePath, newLocation); // Перемещаем или заменяем файл
      console.log(`File moved: ${file}`);
    }
  });
}

module.exports = transferOldFiles;
