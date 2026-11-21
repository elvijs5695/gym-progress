import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

const win = new Window({url:'https://gym-progress.test/'});
for (const key of ['window','document','navigator','localStorage','HTMLElement','CustomEvent','MutationObserver','Node','NodeFilter','AbortController']) {
  Object.defineProperty(globalThis,key,{value:key==='window'?win:win[key],configurable:true});
}
globalThis.getComputedStyle=win.getComputedStyle.bind(win);
const systemTheme = new win.EventTarget();
systemTheme.matches=false;
win.matchMedia=()=>systemTheme;
win.scrollTo=(x,y)=>{Object.defineProperty(win,'scrollX',{value:x,configurable:true});Object.defineProperty(win,'scrollY',{value:y,configurable:true});};
document.head.innerHTML='<meta name="theme-color" content="#fff">';
document.body.innerHTML='<div id="app"></div><div id="status-root" aria-live="polite"></div><div id="dialog-root"></div>';
const app=document.getElementById('app'), dialogRoot=document.getElementById('dialog-root');
const UI=await import('../ui-components.js');
const I18N=await import('../i18n.js');
const tests=[];
const test=(name,fn)=>tests.push([name,fn]);
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
let language='en',changes=[],moves=[];
UI.initUI({getLanguage:()=>language,onThemeChange:value=>changes.push(value),onReorder:(...args)=>moves.push(args),closeDialog:()=>{dialogRoot.innerHTML='';}});

test('Keyed EN/LV translations preserve parameters and user content',()=>{
  app.innerHTML='<div data-i18n="workout.startNamed" data-i18n-params=\'{"name":"Row"}\'></div><span data-user-content translate="no">Row</span><div class="title">Back Squat</div><select aria-label="Exercise"><option value="u:1">Row</option></select><input id="custom-name" value="Bench press"><label class="field">Name</label>';
  I18N.localizeDom(app,'lv');
  assert.equal(app.querySelector('[data-i18n]').textContent,'Sākt Row?');
  assert.equal(app.querySelector('[data-user-content]').textContent,'Row');
  assert.equal(app.querySelector('.title').textContent,'Back Squat');
  assert.equal(app.querySelector('option').textContent,'Row');
  assert.equal(app.querySelector('input').value,'Bench press');
  assert.equal(app.querySelector('.field').textContent,'Nosaukums');
  I18N.localizeDom(app,'en');
  assert.equal(app.querySelector('[data-i18n]').textContent,'Start Row?');
  assert.equal(app.querySelector('.field').textContent,'Name');
  assert.equal(I18N.t('Start Row?','lv'),'Sākt Row?');
});
test('Keyed containers do not flatten user content or nested controls',()=>{
  app.innerHTML='<div data-i18n="actions.save"><button id="nested">Go</button><span data-user-content>Row</span></div><span data-user-content data-i18n="actions.save">Save</span>';
  I18N.localizeDom(app,'lv');
  assert.equal(app.querySelector('#nested').textContent,'Go');
  assert.equal(app.querySelector('div [data-user-content]').textContent,'Row');
  assert.equal(app.querySelector(':scope>span').textContent,'Save');
});
test('Safe field and button builders escape HTML and never emit event attributes',()=>{
  const html=UI.fieldHTML({id:'weight',label:'Weight <kg>',value:'63.5',help:'One dumbbell',error:'Check value'})+UI.buttonHTML({label:'<script>bad</script>',action:'save',data:{id:'" onmouseover="evil'}})+UI.userText('<img src=x onerror=evil>');
  app.innerHTML=html;
  assert.equal(app.querySelector('script'),null);
  assert.equal(app.querySelector('img'),null);
  assert.equal(app.querySelector('input').value,'63.5');
  assert.equal(app.querySelector('label').htmlFor,'weight');
  assert.equal(app.querySelector('input').getAttribute('aria-describedby'),'weight-help weight-error');
  assert.equal(app.querySelector('[onmouseover]'),null);
  assert.equal(app.querySelector('[data-user-content]').textContent,'<img src=x onerror=evil>');
});
test('Light/dark/system choice works through delegated native controls',()=>{
  app.innerHTML=UI.themePickerHTML('en');
  const dark=app.querySelector('[value="dark"]');dark.checked=true;dark.dispatchEvent(new win.Event('change',{bubbles:true}));
  assert.equal(UI.getTheme(),'dark');assert.equal(document.documentElement.dataset.resolvedTheme,'dark');
  assert.equal(localStorage.getItem('gym-progress-ui-theme-v2'),'dark');
  assert.equal(changes.at(-1),'dark');
  assert.equal(UI.setTheme('invalid'),false);assert.equal(UI.getTheme(),'dark');
  UI.setTheme('system');systemTheme.matches=true;systemTheme.dispatchEvent(new win.Event('change'));
  assert.equal(document.documentElement.dataset.resolvedTheme,'dark');
  systemTheme.matches=false;systemTheme.dispatchEvent(new win.Event('change'));
  assert.equal(document.documentElement.dataset.resolvedTheme,'light');
  assert.equal(app.querySelector('[value="system"]').checked,true);
});
test('Field label binding covers sibling and cardio group inputs without changing values',()=>{
  app.innerHTML='<label class="field">Distance (km)</label><div class="cardio-optional-field"><input id="distance" value="0"><button>N/A</button></div><div><span class="field">Power</span><input value="120"></div><label>Nested<input id="nested" value="3"></label>';
  UI.bindFieldLabels(app);
  assert.equal(app.querySelector('label.field').htmlFor,'distance');
  const power=app.querySelector('div>input:not(#distance)');
  assert.ok(power.getAttribute('aria-labelledby'));
  assert.equal(power.value,'120');assert.equal(app.querySelector('#distance').value,'0');
  assert.equal(app.querySelector('#nested').labels.length,1);
});
test('Full same-view renders preserve focused draft, caret, detail state and scroll',()=>{
  const html='<details id="more"><summary>Details</summary><input id="draft" value="63"></details><div class="segmented" id="metrics"></div>';
  app.innerHTML=html;UI.enhanceUI(app,{scope:'settings:weight'});
  app.querySelector('details').open=true;
  const input=app.querySelector('input');input.value='63.50';input.focus();input.setSelectionRange(2,4);input.dispatchEvent(new win.Event('input',{bubbles:true}));
  app.querySelector('#metrics').scrollLeft=85;win.scrollTo(0,240);
  const snapshot=UI.captureUIState(app);
  app.innerHTML=html;UI.enhanceUI(app,{scope:'settings:weight'});
  assert.equal(UI.restoreUIState(app,snapshot),true);
  assert.equal(document.activeElement.id,'draft');assert.equal(document.activeElement.value,'63.50');
  assert.equal(document.activeElement.selectionStart,2);assert.equal(document.activeElement.selectionEnd,4);
  assert.equal(app.querySelector('#metrics').scrollLeft,85);assert.equal(win.scrollY,240);assert.equal(app.querySelector('details').open,true);
});
test('Navigation cannot restore stale focus or drafts into a different view',()=>{
  const snapshot=UI.captureUIState(app);
  app.innerHTML='<input id="draft" value="New view">';UI.enhanceUI(app,{scope:'home'});
  assert.equal(UI.restoreUIState(app,snapshot),false);assert.equal(app.querySelector('input').value,'New view');
});
test('IME composition defers destructive renders until completion',async()=>{
  app.innerHTML='<input id="compose">';let rendered=0;
  const input=app.querySelector('input');input.dispatchEvent(new win.CompositionEvent('compositionstart',{bubbles:true}));
  assert.equal(UI.deferWhileComposing(app,()=>rendered++),true);assert.equal(rendered,0);
  input.dispatchEvent(new win.CompositionEvent('compositionend',{bubbles:true}));await tick();
  assert.equal(rendered,1);assert.equal(UI.isComposing(app),false);
});
test('SafeDOM metadata receives named controls and keyboard-accessible card titles',()=>{
  app.innerHTML='<div class="card programme-day" data-action-click="gp.nav(\'workout\',1)"><div class="title"><span data-user-content>Row</span></div><button id="delete" class="icon-btn" data-action-click="gp.deleteWorkout(1)">×</button></div><div class="weight-value" data-action-click="gp.customWeight()">63.5 kg</div>';
  let opened=0,edited=0;app.querySelector('.programme-day').addEventListener('click',()=>opened++);app.querySelector('.weight-value').addEventListener('click',()=>edited++);
  UI.enhanceUI(app,{language:'en',scope:'programme'});
  assert.equal(app.querySelector('#delete').getAttribute('aria-label'),'Delete workout');
  app.querySelector('.ui-card-open').click();assert.equal(opened,1);
  const weight=app.querySelector('.weight-value');assert.equal(weight.getAttribute('role'),'button');
  weight.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(edited,1);
});
test('Grip-only reorder is keyboard-accessible, bounded and has no duplicate arrow controls',()=>{
  app.innerHTML=[1,2].map(id=>`<div class="card programme-day reorder-row"><div class="title">Day ${id}</div><span class="drag-grip" data-reorder-kind="workout" data-reorder-id="${id}"></span></div>`).join('');
  UI.enhanceUI(app,{scope:'programme'});
  const grips=app.querySelectorAll('.drag-grip');assert.equal(app.querySelectorAll('.reorder-actions').length,0);
  assert.equal(grips[0].getAttribute('role'),'button');assert.equal(grips[0].getAttribute('tabindex'),'0');
  assert.equal(grips[0].getAttribute('aria-keyshortcuts'),'Alt+ArrowUp Alt+ArrowDown');
  const count=moves.length;
  grips[0].dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowUp',altKey:true,bubbles:true,cancelable:true}));assert.equal(moves.length,count);
  grips[1].dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true,cancelable:true}));assert.equal(moves.length,count);
  grips[0].dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true,cancelable:true}));assert.deepEqual(moves.at(-1),['workout','1',1]);
  UI.enhanceUI(app,{scope:'programme'});
  grips[1].dispatchEvent(new win.KeyboardEvent('keydown',{key:'ArrowUp',altKey:true,bubbles:true,cancelable:true}));assert.equal(moves.length,count+2);
});
test('Shared setting roles preserve form values and expose selected share state',()=>{
  app.innerHTML='<label class="setting-toggle-row"><span class="setting-toggle-copy"><strong>Sound</strong><small>Timers</small></span><input type="checkbox" checked></label><button class="share-toggle on">Share</button>';
  UI.enhanceUI(app,{scope:'settings'});
  assert.ok(app.querySelector('label').classList.contains('ui-item'));
  assert.ok(app.querySelector('strong').classList.contains('ui-item-title'));
  assert.ok(app.querySelector('small').classList.contains('ui-item-description'));
  assert.equal(app.querySelector('input').checked,true);
  assert.equal(app.querySelector('button').getAttribute('aria-pressed'),'true');
});
test('Disclosure opening and closing animations retain content and respect reduced motion',()=>{
  let animations=[];
  app.innerHTML='<div data-disclosure-key="home:1" data-expanded="false"><div>Exercise details</div></div>';
  UI.enhanceUI(app,{scope:'home'});const before=UI.captureUIState(app);
  app.innerHTML='<div data-disclosure-key="home:1" data-expanded="true"><div>Exercise details</div></div>';
  UI.enhanceUI(app,{scope:'home'});let el=app.firstElementChild;
  el.getBoundingClientRect=()=>({height:100});el.animate=(frames,options)=>animations.push({frames,options});
  UI.restoreUIState(app,before);assert.equal(animations.length,1);assert.deepEqual(animations[0].frames,[{height:'0px'},{height:'100px'}]);
  const opened=UI.captureUIState(app);app.innerHTML='<div data-disclosure-key="home:1" data-expanded="false" inert aria-hidden="true"><div>Exercise details</div></div>';
  UI.enhanceUI(app,{scope:'home'});el=app.firstElementChild;el.animate=(frames,options)=>animations.push({frames,options});
  UI.restoreUIState(app,opened);assert.equal(animations.length,2);assert.deepEqual(animations[1].frames,[{height:'100px'},{height:'0px'}]);assert.equal(el.textContent,'Exercise details');assert.equal(el.inert,true);
  systemTheme.matches=true;UI.restoreUIState(app,opened);assert.equal(animations.length,2);systemTheme.matches=false;
});
test('Dialog exposes semantics, contains focus, closes via safe action and restores opener',async()=>{
  app.innerHTML='<button id="open">Open</button>';UI.enhanceUI(app,{scope:'home'});const opener=app.querySelector('button');opener.focus();
  dialogRoot.innerHTML='<div class="dialog-backdrop"><div class="dialog"><h2>Confirm</h2><input id="modal-field"><div class="dialog-actions"><button id="cancel" data-action-click="gp.closeDialog()">Cancel</button><button id="save">Save</button></div></div></div>';
  dialogRoot.querySelector('#cancel').addEventListener('click',()=>{dialogRoot.innerHTML='';});
  UI.enhanceDialog(dialogRoot);
  const dialog=dialogRoot.querySelector('.dialog');
  assert.equal(dialog.getAttribute('role'),'dialog');assert.equal(dialog.getAttribute('aria-modal'),'true');
  assert.equal(document.activeElement,dialog.querySelector('h2'));assert.equal(app.inert,true);assert.equal(app.getAttribute('aria-hidden'),'true');
  dialog.querySelector('#save').focus();document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert.equal(document.activeElement.id,'modal-field');
  document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
  assert.equal(document.activeElement.id,'save');
  document.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await tick();
  assert.equal(dialogRoot.querySelector('.dialog'),null);assert.equal(app.inert,false);assert.equal(app.hasAttribute('aria-hidden'),false);assert.equal(document.activeElement,opener);
});
test('Domain uncertainty labels have EN/LV text with no fatigue-attention styling',()=>{
  assert.equal(I18N.message('progress.notAssessed','lv'),'Nav novērtēts');
  assert.equal(I18N.t('There is not enough complete, rated strength data to assess a workout pattern.','lv'),I18N.message('progress.insufficientSummary','lv'));
  app.innerHTML='<span data-i18n="progress.insufficientData"></span>';UI.enhanceUI(app,{language:'lv'});
  assert.equal(app.textContent,'Nepietiek datu');assert.equal(app.querySelector('.trend-attention'),null);
});
test('New helpers never rely on browser-executed inline handlers',()=>{
  app.innerHTML=UI.themePickerHTML('lv')+UI.buttonHTML({action:'save',label:'Save'})+UI.fieldHTML({id:'test-field',label:'Test'});
  UI.enhanceUI(app,{language:'lv'});
  for(const element of app.querySelectorAll('*'))for(const attribute of element.attributes)assert.ok(!/^on/i.test(attribute.name),attribute.name);
});
test('Styles parse, retain both rhythm surfaces and honor reduced motion',async()=>{
  const design=await readFile(new URL('../design-system.css',import.meta.url),'utf8');
  const css=await readFile(new URL('../ui.css',import.meta.url),'utf8');
  const sheet=new win.CSSStyleSheet();sheet.replaceSync(design+'\n'+css);
  assert.ok(sheet.cssRules.length>150);
  for(const selector of ['.timeline-card','.friends-timeline-card','.tracker-progress-now','.log-session-card','.cardio-optional-field','.finish-particles','.share-summary-dialog.finish-reveal'])assert.ok(css.includes(selector),selector);
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('.finish-particles{display:none}'));
  assert.ok(!css.includes('url(\'./celebrations/'));
});

let failed=0;
for(const[name,fn]of tests){try{await fn();console.log(`PASS ${name}`);}catch(error){failed++;console.error(`FAIL ${name}\n${error.stack}`);}}
UI.disposeUI();win.happyDOM.abort();
console.log(`\nUI checks: ${tests.length-failed}/${tests.length} passed.`);
if(failed)process.exitCode=1;
