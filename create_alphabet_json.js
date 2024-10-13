const fs = require('fs');
const path = require('path');

// Change the directory to 'others'
const directory = path.join('app', 'languages', 'others');

// Ensure the directory exists
if (!fs.existsSync(directory)) {
  fs.mkdirSync(directory, { recursive: true });
}

// Create a JSON file for each letter of the alphabet
for (let charCode = 97; charCode <= 122; charCode++) {
  const letter = String.fromCharCode(charCode);
  const fileName = `${letter}.json`;
  const filePath = path.join(directory, fileName);
  
  // Create an empty JSON object
  const content = '{}';

  // Write the file
  fs.writeFileSync(filePath, content);
  console.log(`Created ${fileName}`);
}

console.log('All alphabet JSON files have been created in the "others" folder.');
