const fs = require('fs-extra');
const path = require('path');
const statisticsPath = path.join(__dirname, '..', 'statistics.json');

function getStats(req, res) {
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
      res.json(stats);
    })
    .catch(err => {
      console.error(`Ошибка при чтении файла статистики: ${err}`);
      res.status(500).send('Ошибка при чтении файла статистики');
    });
}

module.exports = getStats;
