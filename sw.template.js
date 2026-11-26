/* The build replaces this manifest with verified release assets. */
const RELEASE=__RELEASE_MANIFEST__;
const PREFIX='gym-progress-v2-release-',SCOPE=new URL(self.registration.scope);
// CacheStorage is shared by origin. Include the exact registration scope so a
// second installation (or an unrelated app) cannot lose its release cache.
const OWN_PREFIX=PREFIX+encodeURIComponent(SCOPE.href)+'|',CACHE=OWN_PREFIX+RELEASE.id;
const METADATA_URL=new URL('__gp_release_metadata__',SCOPE).href;
const releaseId=id=>typeof id==='string'&&/^[a-zA-Z0-9._-]+$/.test(id);
const ownCache=name=>name.startsWith(OWN_PREFIX)&&releaseId(name.slice(OWN_PREFIX.length));
const assetManifest=()=>JSON.stringify(RELEASE.assets);
function validateRelease(){
 if(!releaseId(RELEASE.id)||!Array.isArray(RELEASE.assets)||!RELEASE.assets.length)throw new Error('Invalid release manifest');
 const paths=new Set();
 for(const asset of RELEASE.assets){
  if(typeof asset.path!=='string'||!asset.path||asset.path.startsWith('/')||!/^[a-zA-Z0-9._/-]+$/.test(asset.path)||asset.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(asset.path)||!/^([a-f0-9]{64})$/.test(asset.sha256))throw new Error('Invalid release asset');
  const url=new URL(asset.path,SCOPE);if(url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname)||url.href===METADATA_URL)throw new Error('Release asset is outside this app');paths.add(asset.path);
 }
}
async function metadata(cache){try{return await(await cache.match(METADATA_URL))?.json()||null;}catch{return null;}}
async function writeMetadata(cache,value){await cache.put(METADATA_URL,new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}}));}
function ownsClient(client){try{const url=new URL(client.url);return (!client.type||client.type==='window')&&url.origin===SCOPE.origin&&url.pathname.startsWith(SCOPE.pathname);}catch{return false;}}
async function appWindows(){return(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(ownsClient);}
let approvedUpdate=false;
// Other windows are queried for actual unfinished work; a stale or older window
// that cannot answer is NOT mistaken for a safe one.
async function confirmIdle(client){
 if(typeof client.postMessage!=='function')return null;
 return new Promise(resolve=>{
  const channel=new MessageChannel();let complete=false;
  const done=value=>{if(complete)return;complete=true;clearTimeout(timer);channel.port1.close();channel.port2.close();resolve(value);};
  const timer=setTimeout(()=>done(null),6000);
  channel.port1.onmessage=event=>done(event.data?.type==='UPDATE_STATE'&&typeof event.data.safe==='boolean'?event.data.safe:null);
  try{client.postMessage({type:'CHECK_UPDATE_STATE'},[channel.port2]);}catch{done(null);}
 });
}
async function storedWorkBlocksUpgrade(){
 if(typeof indexedDB==='undefined')return false; // Only in synthetic SW tests.
 return await new Promise((resolve,reject)=>{
  let db,finished=false;const done=v=>{if(finished)return;finished=true;try{db?.close();}catch{}resolve(v);};
  const request=indexedDB.open('gym-progress-v2',1);
  // A first-time visitor has no training database yet. Abort the upgrade
  // instead of creating an incomplete DB and permit this fresh installation;
  // the expected abort/error event must not reject the worker install.
  request.onupgradeneeded=event=>{if(event.oldVersion===0){try{request.transaction?.abort();}catch{}done(false);}else{try{request.transaction?.abort();}catch{}reject(new Error('Cannot read newer local training schema'));}};
  request.onerror=()=>{if(!finished)reject(new Error('Cannot inspect local workout state before upgrade'));};
  request.onsuccess=()=>{
   db=request.result;
   if(!db.objectStoreNames.contains('meta')){done(false);return;}
   const query=db.transaction('meta','readonly').objectStore('meta').getAll();
   query.onerror=()=>reject(new Error('Cannot read saved workout guard'));
   query.onsuccess=()=>{
    const records=query.result||[];
    const activeScope=records.find(record=>typeof record?.activeScope==='string')?.activeScope;
    const busy=records.some(record=>{
     const state=record?.state;if(!state||typeof state!=='object')return false;
     if(state.runtime)return true;
     const owner=state.sync_foundation?.accountId;
     // Older clients without a workspace marker are checked conservatively.
     // Hidden, signed-out account records must not trap an otherwise safe
     // guest session permanently on an old release.
     if(!owner||(activeScope&&activeScope!=='account:'+owner))return false;
     const sync=state.sync_foundation||{},enabled=new Set(Object.entries(sync.domains||{}).filter(([,d])=>d?.enabled).map(([name])=>name));
     const localPending=Object.values(sync.records||{}).some(m=>m.pending&&!m.suppressed&&enabled.has(m.domain));
     const outboxPending=(sync.outbox||[]).some(item=>!item.blocked&&item?.mutation?.entity_type);
     return localPending||outboxPending;
    });
    done(busy);
   };
  };
 });
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 validateRelease();
 if(await storedWorkBlocksUpgrade())throw new Error('Upgrade deferred: saved workout or account upload is unfinished');const existed=(await caches.keys()).includes(CACHE),cache=await caches.open(CACHE),previous=await metadata(cache);
 // A failed reinstallation of identical bytes must not remove the cache still
 // serving an active page. A reused release ID with different bytes is invalid.
 if(existed&&previous?.complete&&previous.assetManifest!==assetManifest())throw new Error('Release ID was reused with different assets');
 try{
  let nextAsset=0;
  const fetchAndVerify=async()=>{
   while(nextAsset<RELEASE.assets.length){
    const asset=RELEASE.assets[nextAsset++],url=new URL(asset.path,SCOPE);
    const response=await fetch(url,{cache:'reload',credentials:'same-origin'});
    if(!response.ok)throw new Error('Incomplete release: '+asset.path+' (HTTP '+response.status+')');
    const bytes=await response.clone().arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(hash!==asset.sha256||(asset.bytes!=null&&asset.bytes!==bytes.byteLength))throw new Error('Release verification failed: '+asset.path);
    await cache.put(url,response);
   }
  };
  // Drain all in-flight requests before removing an incomplete cache; avoid
  // writing into the same cache after failure cleanup.
  const results=await Promise.allSettled(Array.from({length:Math.min(6,RELEASE.assets.length)},()=>fetchAndVerify()));
  const failed=results.find(x=>x.status==='rejected');if(failed)throw failed.reason;
  await writeMetadata(cache,{scope:SCOPE.href,releaseId:RELEASE.id,assetManifest:assetManifest(),complete:true,verifiedAt:Date.now(),activatedAt:previous?.activatedAt||null});
  // No implicit upgrade of a live tab. Browser refresh or an explicit
  // "Update now" action is the only way a verified waiting worker activates.
  // An installation with no clients is still refused if a locally stored
  // workout or upload is unfinished: browser shutdown cannot bypass the gate.

 }catch(error){if(!existed)await caches.delete(CACHE);throw error;}
 // No automatic skipWaiting: an open workout continues using its complete release.
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='GET_RELEASE_STATUS'&&event.ports?.[0]){
  event.ports[0].postMessage({type:'RELEASE_STATUS',version:RELEASE.version,id:RELEASE.id});
  return;
 }
 if(event.data?.type!=='ACTIVATE_RELEASE'||!event.ports?.[0])return;
 const reply=value=>event.ports[0].postMessage({type:'ACTIVATE_RELEASE_RESULT',releaseId:RELEASE.id,...value});
 event.waitUntil((async()=>{
  try{
   const windows=await appWindows();
   if(!windows.some(client=>client.id===event.source?.id)){reply({ok:false,code:'INVALID_CLIENT'});return;}
   if(event.data.workoutActive!==false||event.data.unsavedChanges!==false){reply({ok:false,code:'ACTIVE_WORKOUT'});return;}
   const other=windows.filter(client=>client.id!==event.source.id),status=await Promise.all(other.map(confirmIdle));
   if(status.some(value=>value===false)){reply({ok:false,code:'OTHER_WINDOW_BUSY'});return;}
   if(status.some(value=>value!==true)){reply({ok:false,code:'UNCONFIRMED_WINDOW'});return;}
   approvedUpdate=true;
   await self.skipWaiting();reply({ok:true,code:'ACTIVATING'});
  }catch{reply({ok:false,code:'ACTIVATION_FAILED'});}
 })());
});
async function collectOlderReleases(){
 const candidates=[];
 for(const name of await caches.keys()){
  if(!ownCache(name)||name===CACHE)continue;
  const cache=await caches.open(name),info=await metadata(cache);
  // A similarly named cache without our marker is not evidence of ownership.
  if(info?.scope===SCOPE.href&&info.complete&&name===OWN_PREFIX+info.releaseId)candidates.push({...info,name});
 }
 candidates.sort((a,b)=>(Number(b.activatedAt)>0)-(Number(a.activatedAt)>0)||(Number(b.activatedAt)||Number(b.verifiedAt)||0)-(Number(a.activatedAt)||Number(a.verifiedAt)||0));
 const previous=candidates[0]?.name;
 for(const candidate of candidates)if(candidate.name!==previous)await caches.delete(candidate.name);
}
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 if(await storedWorkBlocksUpgrade())throw new Error('Activation deferred: unfinished workout or active-account upload');
 const cache=await caches.open(CACHE),info=await metadata(cache);if(!info?.complete||info.scope!==SCOPE.href)throw new Error('Cannot activate an incomplete release');
 await writeMetadata(cache,{...info,activatedAt:Date.now()});
 // An unapproved first installation may still have more than one client.
 // A coordinated upgrade can claim several idle windows, but do not delete
 // old release caches until only one window remains.
 const windows=await appWindows();
 if(windows.length>1&&!approvedUpdate)return;
 await self.clients.claim();
 if(windows.length<=1)await collectOlderReleases();
})()));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url),scope=new URL(self.registration.scope);
 if(event.request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 const relative=url.pathname.slice(scope.pathname.length)||'index.html',path=relative.endsWith('/')?relative+'index.html':relative;
 if(!RELEASE.assets.some(x=>x.path===path))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(new URL(path,scope));if(cached)return cached;return new Response('Offline release is incomplete. Open recovery.html.',{status:503,headers:{'Content-Type':'text/plain'}});})());
});
