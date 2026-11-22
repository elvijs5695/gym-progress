/** Request a real service-worker update and inspect installation, without
 * unregistering a worker or touching IndexedDB/caches. Status is an observation,
 * never an authorisation to activate while user work is unsaved. */
export async function checkForWaitingRelease(registration,{timeoutMs=15000}={}){
 if(!registration||typeof registration.update!=='function')return {kind:'unavailable'};
 if(registration.waiting)return {kind:'waiting'};
 let timer;
 try{
  await Promise.race([
   registration.update(),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Release check timed out')),timeoutMs);})
  ]);
 }catch(error){return {kind:'error',message:String(error?.message||error)};}
 finally{clearTimeout(timer);}
 if(registration.waiting)return {kind:'waiting'};
 const installing=registration.installing;
 if(!installing)return {kind:'current'};
 if(installing.state==='installed')return {kind:registration.waiting?'waiting':'installing'};
 if(['redundant','activated'].includes(installing.state))return {kind:registration.waiting?'waiting':'current'};
 return new Promise(resolve=>{
  let done=false;
  const finish=kind=>{if(done)return;done=true;clearTimeout(timer);installing.removeEventListener?.('statechange',onStateChange);resolve({kind});};
  const onStateChange=()=>{
   if(registration.waiting)return finish('waiting');
   if(['installed','activated','redundant'].includes(installing.state))return finish(registration.waiting?'waiting':installing.state==='installed'?'installing':'current');
  };
  installing.addEventListener('statechange',onStateChange);
  timer=setTimeout(()=>finish(registration.waiting?'waiting':'installing'),timeoutMs);
  onStateChange();
 });
}
