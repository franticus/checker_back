const fs = require('fs-extra');
const path = require('path');

const checkedArchiveDir = path.resolve(__dirname, '..', 'checkedArchive');
const dataBaseCheckedArchiveDir = path.resolve(
  __dirname,
  '..',
  'DataBaseCheckedArchive'
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
    const sixtyDaysAgo = new Date(
      currentDate.getTime() - 60 * 24 * 60 * 60 * 1000
    ); // 60 дней в миллисекундах

    if (fileDate < sixtyDaysAgo) {
      const newLocation = path.join(dataBaseCheckedArchiveDir, file);
      fs.renameSync(filePath, newLocation); // Перемещаем или заменяем файл
      console.log(`File moved: ${file}`);
    }
  });
}

module.exports = transferOldFiles;
