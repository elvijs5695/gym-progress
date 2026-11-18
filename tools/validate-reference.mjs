import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {restoreCachedReferenceData,refreshReferenceData} from '../exercise-reference-cache.js';
import {alternativeRelation} from '../exercise-alternatives.js';
import {CANONICAL_BY_KEY,CANONICAL_EXERCISES} from '../exercise-catalogue.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'exercise-catalogue.json'),'utf8'));
const sql=fs.readFileSync(path.join(root,'supabase/SUPABASE_EXERCISE_REFERENCE_CARDIO_UPDATE_1.6.5_1.7.5.sql'),'utf8');
const seeds=[...sql.matchAll(/INSERT INTO public\.canonical_exercise_substitutions\(source_exercise_id,alternative_exercise_id,relationship,priority\) SELECT s\.id,t\.id,'(EQUIVALENT|CLOSE)',(\d+) FROM public\.canonical_exercises s JOIN public\.canonical_exercises t ON t\.key='([^']+)' WHERE s\.key='([^']+)'/g)]
  .map(m=>({sourceKey:m[4],targetKey:m[3],relationship:m[1],priority:Number(m[2])}));
assert.equal(catalogue.exercises.length,205);
assert.equal(catalogue.exercises.filter(e=>e.category==='CARDIO').length,14);
assert.equal(catalogue.families.length,34);
assert.equal(seeds.length,50);
const keys=new Set(catalogue.exercises.map(e=>e.key));
for(const row of seeds){assert(keys.has(row.sourceKey));assert(keys.has(row.targetKey));}
assert.equal(alternativeRelation('barbell_back_squat','barbell_front_squat'),'CLOSE'); // bundled canonical->legacy alias fallback
const idMap=new Map(catalogue.exercises.map(e=>[e.key,e]));
function snapshot(relations=seeds){return {schemaVersion:2,exercises:catalogue.exercises,relations:relations.map(r=>({
  ...r,sourceLegacyKey:idMap.get(r.sourceKey)?.legacyExerciseKey||null,targetLegacyKey:idMap.get(r.targetKey)?.legacyExerciseKey||null
}))};}
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
assert.equal(restoreCachedReferenceData(),false);
let payload=snapshot();let calls=0;
globalThis.fetch=async (url,opts)=>{
  calls++;
  assert(url.endsWith('/rest/v1/rpc/gym_exercise_reference_snapshot'));
  assert(opts.headers.apikey.startsWith('sb_publishable_'));
  assert(!('Authorization' in opts.headers));
  return {ok:true,status:200,json:async()=>payload};
};
assert.equal(await refreshReferenceData(),true);
assert.equal(calls,1);
assert.equal(CANONICAL_EXERCISES.length,205);
assert.equal(CANONICAL_BY_KEY.get('running').category,'CARDIO');
assert.equal(alternativeRelation('back_squat','front_squat'),'CLOSE'); // legacy source & target
assert.equal(alternativeRelation('barbell_back_squat','barbell_front_squat'),'CLOSE'); // canonical source & target
assert.equal(alternativeRelation('barbell_bench_press','dumbbell_bench_press'),'EQUIVALENT');
assert.equal(await refreshReferenceData(),false); // 6h throttle
assert.equal(calls,1);
assert.equal(restoreCachedReferenceData(),true); // persistent offline copy
// A centrally removed EXPLICIT relationship must disappear (no old hard-coded fallback).
const omitted=payload.relations.filter(r=>!(r.sourceKey==='barbell_bench_press'&&r.targetKey==='dumbbell_bench_press'));
payload=snapshot(omitted);
store.set('gym-progress-reference-last-check-v2','0');
assert.equal(await refreshReferenceData(),true);
assert.equal(alternativeRelation('barbell_bench_press','dumbbell_bench_press'),null);
assert.equal(alternativeRelation('barbell_bench_press','chest_press_machine'),'EQUIVALENT');
assert.equal(restoreCachedReferenceData(),true);
// No internet: last known good SQL snapshot stays installed.
store.set('gym-progress-reference-last-check-v2','0');
globalThis.fetch=async()=>{throw new Error('offline');};
await assert.rejects(refreshReferenceData(),/offline/);
assert.equal(alternativeRelation('barbell_bench_press','dumbbell_bench_press'),null);
assert.equal(CANONICAL_BY_KEY.get('rowing_cardio').equipment,'CARDIO');
console.log('OK: SQL seed relationships, aliases, remote authority, caching, offline fallback, cardio category');
