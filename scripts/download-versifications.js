const fs = require('fs');
const https = require('https');
const path = require('path');

const versificationsDir = path.join(__dirname, '..', 'assets', 'versifications');

if (!fs.existsSync(versificationsDir)) {
  fs.mkdirSync(versificationsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/Copenhagen-Alliance/versification-specification/master/versification-mappings/standard-mappings/';
const files = ['eng.json', 'lxx.json', 'vul.json']; // Add more files as needed

files.forEach(file => {
  const url = baseUrl + file;
  const filePath = path.join(versificationsDir, file);

  https.get(url, (response) => {
    const fileStream = fs.createWriteStream(filePath);
    response.pipe(fileStream);

    fileStream.on('finish', () => {
      fileStream.close();
      console.log(`Downloaded ${file}`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${file}: ${err.message}`);
  });
});