const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
// Clean up messy previous attempts
css = css.replace(/@media print\s*\{[\s\S]*?\n\}/g, '');
css = css.replace(/@media print\s*\{/g, ''); // Also clean any broken tags

const printCss = `
@media print {
  html, body, #root, main {
    height: auto !important;
    min-height: 0 !important;
    overflow: visible !important;
    background-color: white !important;
    color: black !important;
    display: block !important;
    position: static !important;
  }
  
  aside, .print\\\\:hidden {
    display: none !important;
  }

  /* Target the AdminLayout container */
  #root > div {
    display: block !important;
    height: auto !important;
    overflow: visible !important;
  }

  table { 
    page-break-inside: auto; 
    width: 100% !important;
  }
  tr { 
    page-break-inside: avoid; 
    page-break-after: auto; 
  }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;
fs.writeFileSync('src/index.css', css + printCss);
console.log('Fixed index.css');
