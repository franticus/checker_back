const express = require('express');
const cors = require('cors');
const { JSDOM } = require('jsdom');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');

const port = 3000;

const {
  compareWithCheckedArchive,
  unpackAndSavePlainText,
} = require('./commands/unique.js');
const clearUploadsDirectory = require('./helpers/clearUploadsDirectory.js');

const uploadHandler = require('./commands/uploadHandler');
const uniqueTestHandler = require('./commands/uniquetestHandler');

// const corsOptions = {
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       'https://checkersite.netlify.app',
//       'https://checker-zip-frantunn.amvera.io',
//       'https://checker-zip-frantunn.amvera.io/stats',
//       'https://checker-zip-frantunn.amvera.io/steal',
//       'https://checker-zip-frantunn.amvera.io/apply',
//       'https://checker-zip-frantunn.amvera.io/upload',
//       'https://checker-zip-frantunn.amvera.io/uniquetest',
//       'https://checker-zip-frantunn.amvera.io/uniquetest_url',
//       'https://checker-zip-frantunn.amvera.io/cleanuploads',
//     ];
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('CORS not allowed for this origin'));
//     }
//   },
//   methods: ['GET', 'POST'],
// };

// app.use(cors(corsOptions));

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
const statisticsPath = path.join(__dirname, 'statistics.json');
const checkedArchiveDir = path.join(__dirname, 'checkedArchive');
const textHandlers = require('./commands/textManipulationHandlers');
const statsHandler = require('./commands/statsHandler');

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
});

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

app.post('/upload', upload.single('file'), (req, res) => {
  uploadHandler(req, res, updateStatistics, uploadsDir);
});

app.post('/uniquetest', upload.single('siteZip'), (req, res) => {
  uniqueTestHandler(req, res, uploadsDir);
});

app.post('/steal', textHandlers.steal);
app.post('/apply', textHandlers.apply);

app.get('/stats', statsHandler);

app.post('/cleanuploads', async (req, res) => {
  try {
    await clearUploadsDirectory(uploadsDir);
    res.send('Uploads directory has been cleared successfully.');
  } catch (error) {
    console.error('Error clearing uploads directory:', error);
    res.status(500).send('Error clearing uploads directory');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  fs.ensureDirSync(uploadsDir);
  fs.ensureDirSync(checkedArchiveDir);
});
