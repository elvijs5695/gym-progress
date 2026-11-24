/**
 * Live release verification, independent of the installed cache-first worker.
 * The service worker embeds a hash manifest and verifies ALL bytes before
 * installing. deployment-status.json is additional evidence, not a single
 * point of failure: GitHub Pages may not expose an auxiliary proof despite
 * serving the release manifest and generated service worker correctly.
 */
const stringError = e => String(e?.message || e);
const isHash = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const sha256 = async source => {
 const bytes=new TextEncoder().encode(source);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
};
const manifestIsValid = m => m && typeof m.version==='string' && /^[0-9]+(?:\.[0-9]+){2}$/.test(m.version) &&
 typeof m.id==='string' && m.id.startsWith(m.version+'-') && Array.isArray(m.assets) && m.assets.length > 0 &&
 m.assets.some(a=>a.path==='index.html') && m.assets.some(a=>a.path==='app.js') &&
 m.assets.every(a=>typeof a.path==='string' && /^[a-zA-Z0-9._/-]+$/.test(a.path) &&
 !a.path.startsWith('/') && !a.path.split('/').some(part=>!part||part==='.'||part==='..') &&
 isHash(a.sha256) && Number.isSafeInteger(a.bytes) && a.bytes>=0);
function embeddedManifest(script){
 if(script.includes('__RELEASE_MANIFEST__'))throw new Error('Published sw.js contains an unresolved development placeholder');
 const match=script.match(/(?:^|\n)const RELEASE=([^\n;]+);/);
 if(!match)throw new Error('Published sw.js does not contain a generated release manifest');
 let value;
 try{value=JSON.parse(match[1]);}catch{throw new Error('Published sw.js has an invalid release manifest');}
 if(!manifestIsValid(value))throw new Error('Published sw.js contains an incomplete or unsafe release manifest');
 return value;
}
export async function inspectPublishedRelease({base='./',fetchImpl=fetch}={}) {
 try{
  const root=new URL(base,location.href),url=name=>new URL(name,root);
  const workerResponse=await fetchImpl(url('sw.js'),{cache:'no-store'});
  if(!workerResponse.ok)throw new Error('Published sw.js cannot be retrieved (HTTP '+workerResponse.status+')');
  const script=await workerResponse.text(),embedded=embeddedManifest(script);
  const releaseResponse=await fetchImpl(url('release.json'),{cache:'no-store'});
  if(!releaseResponse.ok)throw new Error('Published release.json cannot be retrieved (HTTP '+releaseResponse.status+')');
  let published;
  try{published=await releaseResponse.json();}catch{throw new Error('Published release.json is not JSON');}
  if(!manifestIsValid(published)||JSON.stringify(published)!==JSON.stringify(embedded))
   throw new Error('Published release.json and sw.js contain different or invalid asset manifests');
  let proofStatus='missing';
  try{
   const proofResponse=await fetchImpl(url('deployment-status.json'),{cache:'no-store'});
   if(proofResponse.ok){
    let proof;
    try{proof=await proofResponse.json();}catch{throw new Error('Published deployment-status.json is invalid JSON');}
    const workerHash=await sha256(script);
    if(proof?.version!==published.version||proof?.id!==published.id||proof?.serviceWorkerSha256!==workerHash||proof?.assetCount!==published.assets.length)
     throw new Error('Published deployment proof disagrees with the service worker or release manifest');
    proofStatus='verified';
   }else if(proofResponse.status!==404){
    throw new Error('Deployment proof HTTP '+proofResponse.status);
   }
  }catch(error){
   // A known-missing optional proof is safe: install itself verifies every
   // declared asset's SHA-256. A present but invalid or inconsistent proof is NOT safe.
   if(!String(error?.message||error).includes('Deployment proof HTTP'))throw error;
   proofStatus='unavailable';
  }
  return {kind:'published',version:published.version,id:published.id,proofStatus};
 }catch(error){return {kind:'error',message:stringError(error)};}
}

export async function readWorkerRelease(worker,{timeoutMs=1500}={}) {
 if(!worker||typeof worker.postMessage!=='function'||typeof MessageChannel!=='function')return null;
 const channel=new MessageChannel();let timer;
 try {
  return await new Promise(resolve=>{
   let done=false;
   const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};
   channel.port1.onmessage=event=>{
    const reply=event.data;
    finish(reply?.type==='RELEASE_STATUS'&&typeof reply.id==='string'&&typeof reply.version==='string'?{version:reply.version,id:reply.id}:null);
   };
   timer=setTimeout(()=>finish(null),timeoutMs);
   try{worker.postMessage({type:'GET_RELEASE_STATUS'},[channel.port2]);}catch{finish(null);}
  });
 }finally{clearTimeout(timer);channel.port1.close();channel.port2.close();}
}

export async function checkForWaitingRelease(registration,{timeoutMs=15000}={}) {
 if(!registration||typeof registration.update!=='function')return {kind:'unavailable'};
 let timer;
 try {
  // Even when there is a waiting worker, ask the origin for the LATEST script;
  // otherwise a verified but obsolete pending release can be activated forever.
  await Promise.race([
   registration.update(),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Release check timed out')),timeoutMs);})
  ]);
 }catch(error){return {kind:'error',message:stringError(error)};}
 finally{clearTimeout(timer);}
 const installing=registration.installing;
 if(!installing)return {kind:registration.waiting?'waiting':'current'};
 if(installing.state==='redundant')return {kind:'error',message:'The new service worker installation failed; check the published asset set'};
 if(installing.state==='activated')return {kind:registration.waiting?'waiting':'current'};
 if(installing.state==='installed')return {kind:registration.waiting?'waiting':'installing'};
 return new Promise(resolve=>{
  let done=false;
  const finish=result=>{if(done)return;done=true;clearTimeout(timer);installing.removeEventListener?.('statechange',onStateChange);resolve(result);};
  const onStateChange=()=>{
   if(installing.state==='redundant')return finish({kind:'error',message:'The new service worker installation failed; check the published asset set'});
   if(installing.state==='installed')return finish({kind:registration.waiting?'waiting':'installing'});
   if(installing.state==='activated')return finish({kind:registration.waiting?'waiting':'current'});
  };
  installing.addEventListener?.('statechange',onStateChange);
  timer=setTimeout(()=>finish({kind:'error',message:'Service worker installation did not finish'}),timeoutMs);
  onStateChange();
 });
}
