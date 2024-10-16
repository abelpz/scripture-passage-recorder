const fs = require('fs');
const https = require('https');
const path = require('path');

const versificationsDir = path.join(__dirname, '..', 'constants', 'versifications');

const allowedBooks = ['GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL', 'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'];

if (!fs.existsSync(versificationsDir)) {
  fs.mkdirSync(versificationsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/Copenhagen-Alliance/versification-specification/master/versification-mappings/standard-mappings/';
const files = ['eng.json', 'lxx.json', 'vul.json']; // Add more files as needed

files.forEach(file => {
  const url = baseUrl + file;
  const filePath = path.join(versificationsDir, file);

  https.get(url, (response) => {
    let data = '';

    response.on('data', (chunk) => {
      data += chunk;
    });

    response.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        if (jsonData.maxVerses) {
          jsonData.maxVerses = Object.fromEntries(
            Object.entries(jsonData.maxVerses).filter(([book]) => allowedBooks.includes(book))
          );
        }
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        console.log(`Downloaded and filtered ${file}`);
      } catch (error) {
        console.error(`Error processing ${file}: ${error.message}`);
      }
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${file}: ${err.message}`);
  });
});
