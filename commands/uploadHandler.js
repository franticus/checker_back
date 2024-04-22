const fs = require('fs-extra');
const { spawn } = require('child_process');

const clearUploadsDirectory = require('../helpers/clearUploadsDirectory.js');

async function uploadFile(req, res, updateStatistics, uploadsDir) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  const uploadedFile = req.file;

  const results = [`Проверка архива: ${uploadedFile.originalname}`];

  // Проверка на максимальный размер файла (10 МБ)
  const maxFileSize = 10 * 1024 * 1024; // 10 МБ в байтах
  const fileSizeInMB = (uploadedFile.size / 1024 / 1024).toFixed(1);

  if (uploadedFile.size > maxFileSize) {
    results.push(
      `Большой размер архива: ${fileSizeInMB} MB, возможно не пережаты картинки.`
    );
  }

  const child = spawn('node', ['commands/test.js', uploadedFile.path]);

  child.stdout.on('data', data => {
    const stdout = data.toString().trim();
    console.log(`stdout: ${stdout}`);
    const messages = stdout.split('\n').map(msg => msg.trim());
    messages.forEach(msg => {
      if (msg) results.push(msg);
    });
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

    if (results.length <= 1) {
      results.push('Сканирование завершено, проблем не найдено');
    }

    res.send(results.join('|||'));
  });
}

module.exports = uploadFile;
