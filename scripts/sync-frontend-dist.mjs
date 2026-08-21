import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'frontend', 'dist');
const target = path.join(root, 'backend', 'dist', 'public');

if (!fs.existsSync(source)) {
  throw new Error(`Frontend build çıktısı bulunamadı: ${source}`);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(source, target, { recursive: true });

console.log(`✅ Frontend dağıtım çıktısı kopyalandı: ${target}`);
