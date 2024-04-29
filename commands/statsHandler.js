const fs = require('fs-extra');
const path = require('path');
const statisticsPath = path.join(__dirname, '..', 'statistics.json');
const checkedArchiveDir = path.join(__dirname, '..', 'checkedArchive');
const dataBaseCheckedArchiveDir = path.join(
  __dirname,
  '..',
  'dataBaseCheckedArchive'
);
const updateStatistics = require('../helpers/updateStatistics');

function getStats(req, res) {
  fs.readdir(checkedArchiveDir)
    .then(checkedFiles => {
      const archivesDatabaseCount = checkedFiles.length;

      // Получаем количество файлов в папке dataBaseCheckedArchive
      fs.readdir(dataBaseCheckedArchiveDir)
        .then(transferredFiles => {
          const transferredFilesCount = transferredFiles.length;

          // Обновляем статистику с помощью функции updateStatistics
          updateStatistics(stats => {
            stats.archivesDatabase = archivesDatabaseCount;
            stats.transferedFiles = transferredFilesCount;
          });

          // Чтение и отправка статистики
          fs.readJson(statisticsPath, { throws: false })
            .then(stats => {
              if (!stats) {
                stats = {
                  transferedFiles: 0,
                  archivesDatabase: 0,
                  archivesChecked: 0,
                  textsStolen: 0,
                  textsApplied: 0,
                };
              }

              res.json(stats);
            })
            .catch(err => {
              console.error(`Ошибка при чтении файла статистики: ${err}`);
              res.status(500).send('Ошибка при чтении файла статистики');
            });
        })
        .catch(err => {
          console.error(
            `Ошибка при чтении директории dataBaseCheckedArchive: ${err}`
          );
          res
            .status(500)
            .send('Ошибка при чтении директории dataBaseCheckedArchive');
        });
    })
    .catch(err => {
      console.error(`Ошибка при чтении директории checkedArchive: ${err}`);
      res.status(500).send('Ошибка при чтении директории checkedArchive');
    });
}

module.exports = getStats;
