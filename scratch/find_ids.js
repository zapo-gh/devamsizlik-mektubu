const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\AlizMTAL\\Desktop\\Programlar\\İdare Yardımcısı\\dijital_islem_merkezi.html', 'utf8');

const idRegex = /id=["']data-([^"']+)["'][^>]*>([\s\S]*?)</g;
let match;
while ((match = idRegex.exec(content)) !== null) {
    const filename = match[1];
    let b64 = match[2].trim();
    if(b64.length > 100){
        try {
            const decoded = Buffer.from(b64, 'base64').toString('utf8');
            fs.writeFileSync('scratch/decoded_apps/' + filename, decoded);
            console.log("Successfully decoded and saved:", filename);
        } catch(e) {
            console.log("Failed to decode:", filename);
        }
    }
}
