const fs = require('fs-extra');
const path = require('path');
const statisticsPath = path.join(__dirname, '..', 'statistics.json');
const checkedArchiveDir = path.join(__dirname, '..', 'checkedArchive');

function updateStatistics(updateCallback) {
  fs.readdir(checkedArchiveDir)
    .then(files => {
      const archivesDatabase = files.length;

      fs.readJson(statisticsPath, { throws: false })
        .then(stats => {
          if (!stats) {
            stats = {
              visits: 0,
              archivesDatabase: 0,
              archivesChecked: 0,
              textsStolen: 0,
              textsApplied: 0,
            };
          }

          stats.archivesDatabase = archivesDatabase;
          updateCallback(stats);
          fs.writeJson(statisticsPath, stats, { spaces: 2 }).catch(err =>
            console.error(`Ошибка при сохранении статистики: ${err}`)
          );
        })
        .catch(err => console.error(`Ошибка при чтении статистики: ${err}`));
    })
    .catch(err =>
      console.error(`Ошибка при чтении директории checkedArchive: ${err}`)
    );
}

module.exports = updateStatistics;
