/**
 * v1.7.10 PWA startup smoke without an external browser dependency.
 * Import the real app entry module in a minimal browser/IndexedDB environment
 * and exercise Latvian translation of unknown/dynamic visible text, which
 * failed with `Cannot access 'm' before initialization` in v1.7.9.
 * Usage: node tools/smoke-startup.mjs fresh-en|fresh-lv|saved-lv|saved-en
 */
import assert from 'node:assert/strict';
import {t,localizeDom} from '../i18n.js';

const mode=process.argv[2]||'saved-lv';
assert(['fresh-en','fresh-lv','saved-en','saved-lv'].includes(mode));
const lang=mode.split('-')[1];

for(const [text,expected] of [
  ['No matching phrase 987','No matching phrase 987'],
  ['Cardio time 12:45','Kardio ilgums 12:45'],
  ['Duration 1:23','Ilgums 1:23'],
  ['7 exercises','7 vingrinājumi'],
  ['Strength: Comfortable · Cardio: Hard','Spēks: Komfortabls · Kardio: Smags'],
  ['RPE 8','RPE 8'],
  ['Workout rotation','Treniņu secība'],
]){
  assert.equal(t(text,'lv'),expected,`Latvian translation: ${text}`);
  assert.equal(t(text,'en'),text,`English translation: ${text}`);
}

function elem(){return {innerHTML:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){},contains(){return false}},querySelectorAll(){return []},querySelector(){return null},setAttribute(){},getAttribute(){return null}};}
const app=elem(), status=elem(), dialog=elem();
const elements={'#app':app,'#status-root':status,'#dialog-root':dialog};
const rootEl=elem();
globalThis.document={
  documentElement:{lang:'en'},body:{classList:{toggle(){},add(){},remove(){}}},hidden:false,
  querySelector(q){return elements[q]||null},querySelectorAll(){return []},
  getElementById(q){return elements[`#${q}`]||null},addEventListener(){},
  createTreeWalker(root){
    // Browser DOM would provide text nodes extracted from the rendered HTML.
    // Unknown text is essential: it reached the faulty regex before `let m`.
    const messages=['No matching phrase 987','Duration 1:23','7 exercises'];
    const nodes=messages.map(s=>({nodeValue:s}));let i=0;
    return {nextNode(){return nodes[i++]||null}};
  },
};
globalThis.NodeFilter={SHOW_TEXT:4};
globalThis.window={
  matchMedia(){return {matches:false}},addEventListener(){},scrollTo(){},
};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:'Node PWA startup check',storage:null}});
globalThis.Image=class {set src(_){queueMicrotask(()=>this.onload?.());}};
globalThis.localStorage={
  values:new Map([['gym-progress-last-seen-version','1.7.10'],['gym-progress-update-announcement-version','1.7.10']]),
  getItem(k){return this.values.get(k)??null},setItem(k,v){this.values.set(k,String(v))},removeItem(k){this.values.delete(k)}
};
globalThis.sessionStorage={getItem(){return null},setItem(){}};
const saved={internalVersion:8,app_state:{languageCode:lang,nextWorkoutId:1,starterPromptDismissed:true},
  workout_templates:[{id:1,name:'Daily session',position:1,isActive:true}],
  user_exercises:[],template_exercises:[],workout_sessions:[],session_exercises:[],performed_sets:[],tracker_items:[],tracker_states:[],runtime:null};
globalThis.indexedDB={open(){const req={};queueMicrotask(()=>{
  req.result={transaction(){return {objectStore(){return {get(){const query={result:mode.startsWith('saved')?saved:null};queueMicrotask(()=>query.onsuccess?.());return query;},put(){},delete(){}}}}}};
  req.onsuccess?.();
});return req;}};
// No network is required for the local-first first paint.
globalThis.fetch=async()=>{throw new Error('Network unavailable in offline startup smoke')};
globalThis.setInterval=()=>0;
const fatal=[];
const priorError=console.error;
console.error=(...args)=>{fatal.push(args.map(String).join(' '));priorError(...args)};
await import('../app.js');
await new Promise(resolve=>setTimeout(resolve,100));
assert(!app.innerHTML.includes('Could not start'),`PWA failed to initialise: ${app.innerHTML}`);
assert(app.innerHTML.includes('Gym Progress'),`PWA did not paint home screen: ${app.innerHTML.slice(0,120)}`);
assert(app.innerHTML.includes('Daily session')||mode.startsWith('fresh'),'Saved programme was not displayed');
assert(!fatal.length,`PWA emitted an uncaught error: ${fatal.join(', ')}`);
console.log(`PASS PWA first-paint startup: ${mode}`);
