const fs = require('fs');
const filePath = 'C:\\Users\\AlizMTAL\\Desktop\\Programlar\\İdare Yardımcısı\\dijital_islem_merkezi.html';
const content = fs.readFileSync(filePath, 'utf8');

// Find all lines that look like a title or an app name
const lines = content.split('\n');
const shortLines = lines.filter(l => l.length < 500);

let extract = '';
for (let i = 0; i < shortLines.length; i++) {
    const line = shortLines[i];
    if (line.includes('const ') || line.includes('let ') || line.includes('var ') || line.includes('function ')) {
        extract += line.trim() + '\n';
    }
}

fs.writeFileSync('scratch/features_extract.txt', extract);
console.log("Done");
