const fs = require('fs-extra');
const path = require('path');
const statisticsPath = path.join(__dirname, '..', 'statistics.json');
const checkedArchiveDir = path.join(__dirname, '..', 'checkedArchive');

const updateStatistics = require('../helpers/updateStatistics');

function getStats(req, res) {
  updateStatistics(stats => {
    stats.visits = (stats.visits || 0) + 1;
  });

  fs.readdir(checkedArchiveDir)
    .then(files => {
      const archivesDatabaseCount = files.length;
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

          stats.archivesDatabase = archivesDatabaseCount;

          res.json(stats);
        })
        .catch(err => {
          console.error(`Ошибка при чтении файла статистики: ${err}`);
          res.status(500).send('Ошибка при чтении файла статистики');
        });
    })
    .catch(err => {
      console.error(`Ошибка при чтении директории checkedArchive: ${err}`);
      res.status(500).send('Ошибка при чтении директории checkedArchive');
    });
}

module.exports = getStats;
