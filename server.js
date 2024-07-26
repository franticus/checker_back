const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');

const uploadHandler = require('./commands/uploadHandler');
const uniqueTestHandler = require('./commands/uniquetestHandler');
const textHandlers = require('./commands/textManipulationHandlers');
const statsHandler = require('./commands/statsHandler');
const updateStatistics = require('./helpers/updateStatistics');
const cleanUploadsHandler = require('./commands/cleanUploadsHandler');
const cleanNonNewFilesHandler = require('./commands/cleanNonNewFilesHandler');
const transferOldFiles = require('./helpers/transferOldFiles');
const nameCheckHandler = require('./commands/nameCheckHandler');

const port = 80;

app.use(cors());

app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
const checkedArchiveDir = path.join(__dirname, 'checkedArchive');

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

app.post('/upload', upload.single('file'), (req, res) => {
  uploadHandler(req, res, updateStatistics, uploadsDir);
});

app.post('/uniquetest', upload.single('siteZip'), (req, res) => {
  uniqueTestHandler(req, res, uploadsDir);
});

app.post('/steal', textHandlers.steal);
app.post('/apply', textHandlers.apply);

app.get('/stats', statsHandler);

app.post('/cleanuploads', cleanUploadsHandler);

app.post('/cleanNonNewFiles', cleanNonNewFilesHandler);

app.post('/namecheck', nameCheckHandler);

app.post('/transferOldFiles', (req, res) => {
  try {
    transferOldFiles();
    res.send('Files older than two months have been transferred.');
  } catch (error) {
    console.error('Failed to transfer files:', error);
    res.status(500).send('Error transferring files');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  fs.ensureDirSync(uploadsDir);
  fs.ensureDirSync(checkedArchiveDir);
});
