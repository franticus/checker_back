const express = require('express');
const cors = require('cors');
const { JSDOM } = require('jsdom');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const app = express();

const {
  compareWithCheckedArchive,
  unpackAndSavePlainText,
} = require('./commands/unique.js');
const clearUploadsDirectory = require('./helpers/clearUploadsDirectory.js');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
const statisticsPath = path.join(__dirname, 'statistics.json');
const checkedArchiveDir = path.join(__dirname, 'checkedArchive');

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
}); // Ограничение размера файла

// Функция для обновления статистики
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

// Маршруты
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  const uploadedFile = req.file;

  const child = spawn('node', ['commands/test.js', uploadedFile.path]);
  const results = [];

  child.stdout.on('data', data => {
    const stdout = data.toString().trim();
    console.log(`stdout: ${stdout}`);
    if (stdout) results.push(stdout);
  });

  child.stderr.on('data', data => {
    const stderr = data.toString().trim();
    console.error(`stderr: ${stderr}`);
    if (stderr) results.push(stderr);
  });

  child.on('close', async code => {
    updateStatistics(stats => {
      stats.archivesChecked++;
    });
    console.log(`Child process exited with code ${code}`);

    await clearUploadsDirectory(uploadsDir);
    res.send(results.join('\n'));
  });
});

app.post('/uniquetest', upload.single('siteZip'), async (req, res) => {
  const results = [];

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const newText = await unpackAndSavePlainText(
      req.file.path,
      req.file.originalname
    );
    const comparisonResults = compareWithCheckedArchive(newText);
    comparisonResults.sort((a, b) => a.uniquePercentage - b.uniquePercentage);
    const jsonFilePath = path.join(__dirname, 'comparisonResults.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(comparisonResults, null, 2));
    res.json(comparisonResults);
  } catch (error) {
    console.error('Error processing the request:', error);
    await clearUploadsDirectory(uploadsDir);
    results.push({ name: 'Internal Server Error', uniquePercentage: null });
    res.send(results);
  }
});

app.post('/steal', (req, res) => {
  const bodyContent = req.body.content;
  const dom = new JSDOM(bodyContent);
  const texts = {};

  let index = 1;
  dom.window.document.querySelectorAll('body *').forEach(element => {
    if (element.textContent.trim() && element.children.length === 0) {
      texts[`txt${index++}`] = element.textContent.trim();
    }
  });

  // Обновляем статистику использования textstealer
  updateStatistics(stats => {
    stats.textsStolen++;
  });

  res.json(texts);
});

app.post('/apply', (req, res) => {
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

  res.json({ updatedHtml: dom.window.document.body.innerHTML });

  updateStatistics(stats => {
    stats.textsApplied++;
  });
});

app.get('/stats', (req, res) => {
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

  updateStatistics(stats => {
    stats.visits++;
  });
});

app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
