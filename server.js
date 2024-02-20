const express = require('express');
const fileUpload = require('express-fileupload');
const spawn = require('cross-spawn');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(fileUpload());

app.post('/upload', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No files were uploaded.');
  }

  let uploadedFile = req.files.file;

  uploadedFile.mv(`uploads/${uploadedFile.name}`, function (err) {
    if (err) {
      return res.status(500).send(err);
    }

    const child = spawn('node', ['commands/test.js', uploadedFile.name]);
    const results = [];

    child.stdout.on('data', data => {
      const stdout = data.toString().replace(/\n/g, '');
      console.log(`stdout: ${stdout}`);
      results.push(stdout);
    });

    child.stderr.on('data', data => {
      const stderr = data.toString().replace(/\n/g, '');
      console.error(`stderr: ${stderr}`);
      results.push(`Error during file processing: ${stderr}`);
    });

    child.on('close', () => {
      if (results.length === 0 || (results.length === 1 && results[0] === '')) {
        return res.status(500).send('No results found.');
      }
      res.send(results.filter(result => result !== '').join(', '));
    });
  });
});

app.listen(3000, async () => {
  console.log('Сервер запущен на порту 3000');

  try {
    const open = (await import('open')).default;
    open('https://checkersite.netlify.app/');
  } catch (err) {
    console.error(`Ошибка при открытии сайта: ${err.message}`);
  }
});
