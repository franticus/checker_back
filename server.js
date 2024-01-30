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

  uploadedFile.mv(`commands/${uploadedFile.name}`, function (err) {
    if (err) {
      return res.status(500).send(err);
    }

    exec(
      `node commands/test.js ${uploadedFile.name}`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return res.status(500).send(`Error during file processing: ${error}`);
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);

        res.send(stdout);
      }
    );
  });
});

app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});
