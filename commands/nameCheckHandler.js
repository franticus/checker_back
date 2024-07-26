const fs = require('fs');
const path = require('path');
const stringSimilarity = require('string-similarity');

function normalizeName(name) {
  return name.toLowerCase().replace(/[-_]/g, '');
}

module.exports = function nameCheckHandler(req, res) {
  const { companyName } = req.body;

  if (!companyName) {
    return res.status(400).send('Название компании не указано');
  }

  const normalizedCompanyName = normalizeName(companyName);
  const comparisonResultsPath = path.join(
    __dirname,
    '../comparisonResults.json'
  );

  fs.readFile(comparisonResultsPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Ошибка чтения файла:', err);
      return res.status(500).send('Ошибка сервера');
    }

    let isUnique = true;
    const comparisonResults = JSON.parse(data);
    const allNames = comparisonResults.map(result => result.name);
    const normalizedNames = allNames.map(name => normalizeName(name));
    const matches = stringSimilarity.findBestMatch(
      normalizedCompanyName,
      normalizedNames
    ).ratings;

    matches.sort((a, b) => b.rating - a.rating);

    const topMatches = matches.slice(0, 5);

    for (const match of topMatches) {
      if (match.target.includes(normalizedCompanyName)) {
        isUnique = false;
        break;
      }
    }

    if (isUnique) {
      res.send({
        message: `Название "${companyName}" уникально.`,
        similar: topMatches.map(
          match => allNames[normalizedNames.indexOf(match.target)]
        ),
      });
    } else {
      res.send({
        message: `Название "${companyName}" уже используется.`,
        similar: topMatches.map(
          match => allNames[normalizedNames.indexOf(match.target)]
        ),
      });
    }
  });
};
