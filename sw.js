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
self.addEventListener('install',event=>event.waitUntil((async()=>{
 validateRelease();const existed=(await caches.keys()).includes(CACHE),cache=await caches.open(CACHE),previous=await metadata(cache);
 // A failed reinstallation of identical bytes must not remove the cache still
 // serving an active page. A reused release ID with different bytes is invalid.
 if(existed&&previous?.complete&&previous.assetManifest!==assetManifest())throw new Error('Release ID was reused with different assets');
 try{
  for(const asset of RELEASE.assets){const url=new URL(asset.path,SCOPE),response=await fetch(url,{cache:'reload',credentials:'same-origin'});if(!response.ok)throw new Error('Incomplete release: '+asset.path);const bytes=await response.clone().arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',bytes),hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');if(hash!==asset.sha256||asset.bytes!=null&&asset.bytes!==bytes.byteLength)throw new Error('Release verification failed: '+asset.path);await cache.put(url,response);}
  await writeMetadata(cache,{scope:SCOPE.href,releaseId:RELEASE.id,assetManifest:assetManifest(),complete:true,verifiedAt:Date.now(),activatedAt:previous?.activatedAt||null});
 }catch(error){if(!existed)await caches.delete(CACHE);throw error;}
 // No automatic skipWaiting: an open workout continues using its complete release.
})()));
self.addEventListener('message',event=>{
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
