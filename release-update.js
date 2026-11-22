/**
 * Non-destructive update verification. Never activate a waiting worker until
 * its own identity agrees with the live, uncached deployment proof.
 * The deployment-status.json path is intentionally excluded from ALL worker
 * release manifests, including older deployed versions.
 */
const stringError = e => String(e?.message || e);
const isHash = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const sha256 = async source => {
 const bytes = new TextEncoder().encode(source);
 const digest = await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
};

export async function inspectPublishedRelease({base='./',fetchImpl=fetch}={}) {
 try {
  const proofResponse = await fetchImpl(new URL('deployment-status.json',new URL(base,location.href)),{cache:'no-store'});
  if(!proofResponse.ok)throw new Error('deployment-status.json is missing (HTTP '+proofResponse.status+'). Publish the generated dist/ files, not the unbuilt pwa/ sources.');
  const proof=await proofResponse.json();
  if(!proof||typeof proof.version!=='string'||typeof proof.id!=='string'||!proof.id.startsWith(proof.version+'-')||!isHash(proof.serviceWorkerSha256))throw new Error('Invalid or mixed deployed release proof');
  const workerResponse=await fetchImpl(new URL('sw.js',new URL(base,location.href)),{cache:'no-store'});
  if(!workerResponse.ok)throw new Error('Published sw.js is missing (HTTP '+workerResponse.status+')');
  const script=await workerResponse.text();
  if(script.includes('__RELEASE_MANIFEST__')||!script.includes('const RELEASE={"version":"'+proof.version+'","id":"'+proof.id+'"'))throw new Error('Published sw.js is a development template or belongs to a different release');
  if(await sha256(script)!==proof.serviceWorkerSha256)throw new Error('Published worker and release proof disagree (mixed deployment)');
  return {kind:'published',version:proof.version,id:proof.id};
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
