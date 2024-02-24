const express = require('express');
const fileUpload = require('express-fileupload');
const spawn = require('cross-spawn');
const cors = require('cors');
const { JSDOM } = require('jsdom');
const fs = require('fs-extra');
const app = express();
const path = require('path');

// app.use(cors());
app.use(
  cors({
    origin: 'https://checkersite.netlify.app/',
    methods: ['GET', 'POST'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

const uploadsDir = path.join(__dirname, 'uploads');
const statisticsPath = path.join(__dirname, 'statistics.json');

// Функция для обновления статистики
function updateStatistics(updateCallback) {
  fs.readJson(statisticsPath, { throws: false })
    .then(stats => {
      if (!stats) {
        stats = {
          visits: 0,
          archivesChecked: 0,
          textsStolen: 0,
          textsApplied: 0,
        };
      }
      // Вызываем функцию обратного вызова для обновления статистики
      updateCallback(stats);

      // Сохраняем обновленную статистику обратно в файл
      fs.writeJson(statisticsPath, stats, { spaces: 2 }).catch(err =>
        console.error(`Ошибка при сохранении статистики: ${err}`)
      );
    })
    .catch(err => console.error(`Ошибка при чтении статистики: ${err}`));
}

app.post('/upload', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No files were uploaded.');
  }

  let uploadedFile = req.files.file;

  fs.ensureDir(uploadsDir)
    .then(() => {
      uploadedFile.mv(path.join(uploadsDir, uploadedFile.name), function (err) {
        if (err) {
          return res.status(500).send(err);
        }

        const child = spawn('node', ['commands/test.js', uploadedFile.name]);
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

        child.on('close', () => {
          updateStatistics(stats => {
            stats.archivesChecked++;
          });

          res.send(results.join('\n'));
        });
      });
    })
    .catch(err => {
      console.error(`Ошибка при создании директории ${uploadsDir}:`, err);
      res.status(500).send(`Server error: ${err.message}`);
    });
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
        // Если статистика еще не была инициализирована, возвращаем базовый объект
        stats = {
          visits: 0,
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

app.listen(3000, async () => {
  console.log('Сервер запущен на порту 3000');

  // Обновляем статистику посещений
  updateStatistics(stats => {
    stats.visits++;
  });

  try {
    const open = (await import('open')).default;
    open('https://checkersite.netlify.app/');
  } catch (err) {
    console.error(`Ошибка при открытии сайта: ${err.message}`);
  }
});
