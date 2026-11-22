/** Rest countdown cues. This function is side-effect free except for the
 * acknowledgement flags on the supplied rest record. A resumed browser emits
 * at most one cue; it never stacks missed 3/2/1 beeps on the same tick.
 */
export function advanceRestAudioCue(rest,remainingMs,options={}){
 if(!rest)return {changed:false,sound:null};
 const remaining=Number(remainingMs);
 if(!Number.isFinite(remaining))return {changed:false,sound:null};
 let changed=false;let sound=null;const warningSeconds=[0,10,15,30,45,60].includes(Number(options.warningSeconds))?Number(options.warningSeconds):30;const countdownEnabled=options.countdownEnabled!==false;
 const mark=(key)=>{if(rest[key])return false;rest[key]=true;changed=true;return true;};
 if(remaining<=0){
   for(const key of ['warned30','count3','count2','count1'])mark(key);
   if(mark('beeped0'))sound=rest.readyCue==='warmup'?'warmup':'ready';
 }else if(remaining<=1000){
   for(const key of ['warned30','count3','count2'])mark(key);
   if(mark('count1')&&countdownEnabled)sound='countdown';
 }else if(remaining<=2000){
   for(const key of ['warned30','count3'])mark(key);
   if(mark('count2')&&countdownEnabled)sound='countdown';
 }else if(remaining<=3000){
   mark('warned30');if(mark('count3')&&countdownEnabled)sound='countdown';
 }else if(warningSeconds>0&&remaining<=warningSeconds*1000){
   if(mark('warned30')&&remaining>(warningSeconds-5)*1000)sound='warning30';
 }
 return {changed,sound};
}
