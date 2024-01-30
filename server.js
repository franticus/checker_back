const express = require('express');
const fileUpload = require('express-fileupload');
const { exec } = require('child_process');
const app = express();

app.use(fileUpload());

app.post('/upload', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No files were uploaded.');
  }

  let uploadedFile = req.files.file;

  // Сохранение файла в корневой директории сайта
  uploadedFile.mv(`${__dirname}/${uploadedFile.name}`, function (err) {
    if (err) {
      return res.status(500).send(err);
    }

    // Запуск скрипта test.js для обработки файла
    exec(
      `node /commands/test.js ${uploadedFile.name}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return res.status(500).send(`Error during file processing: ${error}`);
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);

        res.send('Файл обработан');
      }
    );
  });
});

app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
