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

if (!joined.includes('1.4.2')) errors.push('v1.4.2 marker missing');
if (!fs.existsSync(path.join(root, 'BEHAVIOUR_CONTRACT.md'))) errors.push('behaviour contract missing');
if (!fs.existsSync(path.join(root, 'ARCHITECTURE.md'))) errors.push('architecture document missing');


const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const socialSql = fs.readFileSync(path.join(root, 'supabase', 'SUPABASE_SOCIAL_SETUP.sql'), 'utf8');
if (!appJs.includes('await persist();ui.setStatusMessage=null;render();')) errors.push('last-set skip does not force the next phase to render');
if (!appJs.includes('if(window.__gpShareDraft)renderShareSummary();')) errors.push('share draft is not restored after app re-render');
if (!appJs.includes("filter(c=>c.selected).map(c=>({...c.event,comment:c.comment?.trim()||null}))")) errors.push('selected shares must publish even without a comment');
if (appJs.includes('onclick="gp.showTimelineEvent')) errors.push('social timeline dots should be visual-only');
if (!css.includes('min-width:0;min-height:0')) errors.push('timeline dots are not protected from global button sizing');
if (/where\s+e\.event_type='workout_summary'/i.test(socialSql)) errors.push('timeline still excludes exercise-record-only shares');
if (!appJs.includes('0.06') || !appJs.includes('0.14')) errors.push('trend-correct chart transition markers missing');
if (!fs.readFileSync(path.join(root, 'social-api.js'), 'utf8').includes('SOCIAL_EVENT_KEYS')) errors.push('social event bulk-insert normalization missing');
if (!socialSql.includes('activity_shared')) errors.push('shared-activity notification schema missing');
if (appJs.includes('Signed in as')) errors.push('signed-in profile card copy still present');

const swPath = fs.existsSync(path.join(root, 'sw.js')) ? path.join(root, 'sw.js') : path.join(root, 'service-worker.js');
const sw = fs.readFileSync(swPath, 'utf8');
if (sw.includes('gym-progress-pwa-v1.4.0')) errors.push('old service-worker cache marker remains');
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
