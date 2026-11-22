import {checkForWaitingRelease} from './release-update.js';

const status=document.getElementById('rescue-status');
const button=document.getElementById('rescue-check');
const setStatus=(message)=>{status.textContent=message;};

// This rescue page contains no workout data or editable user fields, and its
// sole button is disabled while activation is being negotiated.
navigator.serviceWorker?.addEventListener('message',event=>{
  if(event.data?.type==='CHECK_UPDATE_STATE'&&event.ports?.[0]){
    event.ports[0].postMessage({type:'UPDATE_STATE',safe:!button.disabled});
  }
});

async function requestActivation(waiting){
  const channel=new MessageChannel();
  let timeout=null,controllerChanged=false,accepted=false,listener=null;
  try{
    await new Promise((resolve,reject)=>{
      const finish=()=>{if(controllerChanged&&accepted)resolve();};
      listener=()=>{controllerChanged=true;finish();};
      navigator.serviceWorker.addEventListener('controllerchange',listener);
      channel.port1.onmessage=event=>{
        const reply=event.data;
        if(reply?.type!=='ACTIVATE_RELEASE_RESULT')return;
        if(!reply.ok){reject(new Error(reply.code||'ACTIVATION_FAILED'));return;}
        accepted=true;finish();
      };
      timeout=setTimeout(()=>reject(new Error('UPDATE_TIMEOUT')),30000);
      waiting.postMessage({type:'ACTIVATE_RELEASE',workoutActive:false,unsavedChanges:false},[channel.port2]);
    });
    setStatus('New verified release activated. Opening the updated app…');
    location.replace('./index.html');
  }finally{
    clearTimeout(timeout);
    if(listener)navigator.serviceWorker.removeEventListener('controllerchange',listener);
    channel.port1.close();channel.port2.close();
  }
}

button?.addEventListener('click',async()=>{
  button.disabled=true;
  try{
    if(!('serviceWorker' in navigator))throw new Error('This browser does not support offline service workers.');
    setStatus('Checking the web server for an updated service worker…');
    const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
    const outcome=await checkForWaitingRelease(registration,{timeoutMs:20000});
    if(outcome.kind==='error')throw new Error(outcome.message);
    const waiting=registration.waiting;
    if(!waiting){
      setStatus(outcome.kind==='installing'?'An update is still installing. Please retry shortly.':'No newer verified release is waiting. Check that the new PWA has been deployed to this exact address.');
      return;
    }
    setStatus('Update downloaded and verified. Requesting safe activation…');
    await requestActivation(waiting);
  }catch(error){
    const code=String(error?.message||error);
    if(code==='OTHER_WINDOW_BUSY'||code==='UNCONFIRMED_WINDOW')setStatus('Another app window could not confirm it is idle. Close other Gym Progress tabs on this device and retry. No records were changed.');
    else if(code==='UPDATE_TIMEOUT')setStatus('Activation could not be confirmed. Reload this recovery page before trying again. No storage has been cleared.');
    else setStatus('Update could not be completed: '+code+'. Your local data has not been deliberately altered.');
  }finally{button.disabled=false;}
});
