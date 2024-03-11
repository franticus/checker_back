const fs = require('fs-extra');
const { spawn } = require('child_process');
const clearUploadsDirectory = require('../helpers/clearUploadsDirectory.js');

async function uploadFile(req, res, updateStatistics, uploadsDir) {
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
}

module.exports = uploadFile;
