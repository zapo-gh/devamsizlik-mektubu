const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'src', 'pages', 'admin', 'modules');
const files = fs.readdirSync(modulesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(modulesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/from '\.\.\/\.\.\/services\/api'/g, "from '../../../services/api'");
  content = content.replace(/\.then\(res =>/g, ".then((res: any) =>");
  
  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Frontend module files fixed.');
