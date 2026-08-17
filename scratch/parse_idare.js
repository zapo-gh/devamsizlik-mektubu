const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\AlizMTAL\\Desktop\\Programlar\\İdare Yardımcısı\\dijital_islem_merkezi.html';
const content = fs.readFileSync(filePath, 'utf8');

// Basic extraction of sections and ids
const idRegex = /<([a-z]+)[^>]*\bid=["']([^"']+)["']/gi;
const ids = new Set();
let match;
while ((match = idRegex.exec(content)) !== null) {
  if (match[1].toLowerCase() === 'div' || match[1].toLowerCase() === 'section') {
      ids.add(match[2]);
  }
}

// Function definitions
const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/g;
const funcs = new Set();
while ((match = funcRegex.exec(content)) !== null) {
  funcs.add(match[1]);
}

// Write the summary to a local file for inspection
const summaryPath = path.join(__dirname, 'idare_summary.txt');
fs.writeFileSync(summaryPath, `=== DIV/SECTION IDs ===\n${Array.from(ids).join('\n')}\n\n=== FUNCTIONS ===\n${Array.from(funcs).join('\n')}`);
console.log(`Summary written to ${summaryPath}`);
