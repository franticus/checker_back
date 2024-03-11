const { JSDOM } = require('jsdom');

const updateStatistics = require('../helpers/updateStatistics');

function steal(req, res) {
  const bodyContent = req.body.content;
  const dom = new JSDOM(bodyContent);
  const texts = {};

  let index = 1;
  dom.window.document.querySelectorAll('body *').forEach(element => {
    if (element.textContent.trim() && element.children.length === 0) {
      texts[`txt${index++}`] = element.textContent.trim();
    }
  });

  // Обновляем статистику для textsStolen
  updateStatistics(stats => {
    stats.textsStolen = (stats.textsStolen || 0) + 1;
  });

  res.json(texts);
}

function apply(req, res) {
  const { htmlContent, replacements } = req.body;
  const dom = new JSDOM(htmlContent);
  let index = 1;

  dom.window.document.querySelectorAll('body *').forEach(element => {
    if (element.textContent.trim() && element.children.length === 0) {
      const replacementKey = `txt${index}`;
      if (replacements[replacementKey]) {
        element.textContent = replacements[replacementKey];
        index++;
      }
    }
  });

  // Обновляем статистику для textsApplied
  updateStatistics(stats => {
    stats.textsApplied = (stats.textsApplied || 0) + 1;
  });

  res.json({ updatedHtml: dom.window.document.body.innerHTML });
}

module.exports = { steal, apply };
