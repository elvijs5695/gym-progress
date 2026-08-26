import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  if (entry.name === 'node_modules') return [];
  return entry.isDirectory() ? walk(full) : [full];
});
const files = walk(root);
const textFiles = files.filter(f => /\.(?:js|mjs|html|css|json|webmanifest|md)$/.test(f));
const joined = textFiles.map(f => fs.readFileSync(f, 'utf8')).join('\\n');

if (!joined.includes('1.4.0')) errors.push('v1.4.0 marker missing');
if (!fs.existsSync(path.join(root, 'BEHAVIOUR_CONTRACT.md'))) errors.push('behaviour contract missing');
if (!fs.existsSync(path.join(root, 'ARCHITECTURE.md'))) errors.push('architecture document missing');

const swPath = fs.existsSync(path.join(root, 'sw.js')) ? path.join(root, 'sw.js') : path.join(root, 'service-worker.js');
const sw = fs.readFileSync(swPath, 'utf8');
if (sw.includes('gym-progress-pwa-v1.3.1')) errors.push('old service-worker cache marker remains');
const shellMatch = sw.match(/const APP_SHELL = (\[[\s\S]*?\]);/);
if (!shellMatch) errors.push('APP_SHELL not found');
else {
  const shell = JSON.parse(shellMatch[1]);
  for (const item of shell) {
    const rel = item.replace(/^\.\//, '');
    if (!fs.existsSync(path.join(root, rel))) errors.push(`missing service-worker asset: ${item}`);
  }
}

if (errors.length) {
  console.error(errors.join('\\n'));
  process.exit(1);
}
console.log(`OK: ${files.length} PWA files checked`);
