const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\AlizMTAL\\Desktop\\Programlar\\İdare Yardımcısı\\dijital_islem_merkezi.html', 'utf8');

const regex = /<([a-zA-Z0-9]+)([^>]*)>([\s\S]*?)<\/\1>/g;
let match;
while ((match = regex.exec(content)) !== null) {
    if (match[3].length > 100000) {
        console.log("Tag:", match[1], "Attrs:", match[2].substring(0, 100), "Size:", match[3].length);
        // Write the first 50 chars of the content
        console.log("Starts with:", match[3].substring(0, 50));
    }
}
