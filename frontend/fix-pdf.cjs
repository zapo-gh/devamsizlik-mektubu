const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;
  
  content = content.replace(/margin:\s*'10mm'/g, "margin: '0 auto'");
  content = content.replace(/width:\s*'99\.5%'/g, "width: '100%'");
  
  if (content !== original) {
    fs.writeFileSync(f, content);
    changed++;
    console.log("Fixed " + f);
  }
});

console.log('Total files changed: ' + changed);
