const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\AlizMTAL\\Desktop\\Programlar\\İdare Yardımcısı\\dijital_islem_merkezi.html';
const content = fs.readFileSync(filePath, 'utf8');

// Extract CATEGORIES
let categoriesMatch = content.match(/const CATEGORIES\s*=\s*(\[[\s\S]*?\]);\s*const TOTAL/);
if (categoriesMatch) {
    fs.writeFileSync('scratch/categories.json', categoriesMatch[1]);
    console.log("Categories extracted.");
}

// Extract base64 encoded apps
const appRegex = /<script\s+type=["']text\/data["']\s+id=["']data-([^"']+)["']>([\s\S]*?)<\/script>/gi;
let match;
const outDir = path.join(__dirname, 'decoded_apps');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}

while ((match = appRegex.exec(content)) !== null) {
    const filename = match[1];
    const b64 = match[2].trim();
    try {
        const decoded = Buffer.from(b64, 'base64').toString('utf8');
        fs.writeFileSync(path.join(outDir, filename), decoded);
        console.log("Decoded app:", filename);
    } catch (e) {
        console.error("Error decoding", filename);
    }
}
