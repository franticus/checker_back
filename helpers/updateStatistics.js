const fs = require('fs-extra');
const path = require('path');
const statisticsPath = path.join(__dirname, '..', 'statistics.json');
const checkedArchiveDir = path.join(__dirname, '..', 'checkedArchive');
const dataBaseCheckedArchiveDir = path.join(
  __dirname,
  '..',
  'dataBaseCheckedArchive'
);

function updateStatistics(updateCallback) {
  fs.readdir(checkedArchiveDir)
    .then(checkedFiles => {
      const archivesDatabase = checkedFiles.length;

      // Чтение количества файлов в папке dataBaseCheckedArchive
      fs.readdir(dataBaseCheckedArchiveDir)
        .then(transferedFiles => {
          const transferedFilesCount = transferedFiles.length;

          // Чтение и обновление файла статистики
          fs.readJson(statisticsPath, { throws: false })
            .then(stats => {
              if (!stats) {
                stats = {
                  archivesDatabase: 0,
                  archivesChecked: 0,
                  transferedFiles: 0,
                  textsStolen: 0,
                  textsApplied: 0,
                };
              }

              stats.archivesDatabase = archivesDatabase;
              stats.transferedFiles = transferedFilesCount;
              updateCallback(stats);

              fs.writeJson(statisticsPath, stats, { spaces: 2 }).catch(err =>
                console.error(`Ошибка при сохранении статистики: ${err}`)
              );
            })
            .catch(err =>
              console.error(`Ошибка при чтении статистики: ${err}`)
            );
        })
        .catch(err =>
          console.error(
            `Ошибка при чтении директории dataBaseCheckedArchive: ${err}`
          )
        );
    })
    .catch(err =>
      console.error(`Ошибка при чтении директории checkedArchive: ${err}`)
    );
}

module.exports = updateStatistics;
