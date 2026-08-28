import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

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

if (!joined.includes('1.4.6')) errors.push('v1.4.6 marker missing');
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
if (!appJs.includes('fade=.18') || !appJs.includes(' C ${c1x} ${ay}, ${c2x} ${by}, ${bx} ${by}') || !css.includes('vector-effect:non-scaling-stroke')) errors.push('v1.4.6 smoothed/non-scaling chart markers missing');
if (!appJs.includes('const socialDeletePending=new Set()')) errors.push('optimistic social delete pending guard missing');
if (!appJs.includes('socialUi.feed=socialUi.feed.filter(e=>e.id!==id)')) errors.push('optimistic social delete does not remove feed row immediately');
if (!appJs.includes('void performOptimisticSocialDelete(event)')) errors.push('optimistic social delete is not launched asynchronously');
if (/function deleteSocialEvent[\s\S]{0,900}enterFriends\(\)/.test(appJs)) errors.push('social delete still performs a full Friends reload');
if (!appJs.includes('function mainNavIcon(name)')) errors.push('vector main navigation icon helper missing');
if (!fs.readFileSync(path.join(root, 'social-api.js'), 'utf8').includes('SOCIAL_EVENT_KEYS')) errors.push('social event bulk-insert normalization missing');
if (!socialSql.includes('activity_shared')) errors.push('shared-activity notification schema missing');
if (appJs.includes('Signed in as')) errors.push('signed-in profile card copy still present');

if (!appJs.includes("getTimeline('1970-01-01T00:00:00.000Z')")) errors.push('shared timeline does not load full available history');
if (!appJs.includes('function bindFriendsTimeline()')) errors.push('shared timeline pinch/pan binding missing');
if (!appJs.includes('timelineDays:null,timelineEndMs:null')) errors.push('shared timeline viewport state missing');
if (!css.includes('.friends-panel.expanded')) errors.push('expanded Friends panel state is not visually distinct');
if (!css.includes('gap:2px')) errors.push('expanded friend rows are not compact');


for (const rel of ['performance-rules.js','performance-rules.json','performance-rule-cases.json','icons/social-completed-workout.png','icons/social-record-trophy.png']) {
  if (!fs.existsSync(path.join(root, rel))) errors.push(`v1.4.6 asset missing: ${rel}`);
}
if (!appJs.includes("const statusRoot=$('#status-root')") || !appJs.includes("let root=$('#dialog-root')")) errors.push('persistent status/dialog roots missing');
if (!appJs.includes('lastSetZeroRirAcceptable')) errors.push('last-set 0 RIR setting wiring missing');
if (!appJs.includes("x.sessionStatus==='COMPLETE'||(x.sessionStatus==='ABORTED'&&x.fullyCompleted)")) errors.push('completed exercises from aborted sessions are not included in Progress');
if (!appJs.includes("metric===primaryProgressMetric(cur)") || !appJs.includes('actionableFailureCount')) errors.push('primary-metric actionable-failure Progress logic missing');
for (const file of files.filter(f => /\.(?:js|mjs)$/.test(f))) {
  const result = spawnSync(process.execPath, ['--check', file], {encoding:'utf8'});
  if (result.status !== 0) errors.push(`JavaScript syntax error in ${path.relative(root,file)}: ${result.stderr.trim()}`);
}
const ruleResult=spawnSync(process.execPath,[path.join(root,'tools','validate-rules.mjs')],{encoding:'utf8'});
if(ruleResult.status!==0) errors.push(`performance-rule cases failed:
${(ruleResult.stderr||ruleResult.stdout).trim()}`);

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
