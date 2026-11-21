/** Rest countdown cues. This function is side-effect free except for the
 * acknowledgement flags on the supplied rest record. A resumed browser emits
 * at most one cue; it never stacks missed 3/2/1 beeps on the same tick.
 */
export function advanceRestAudioCue(rest,remainingMs){
 if(!rest)return {changed:false,sound:null};
 const remaining=Number(remainingMs);
 if(!Number.isFinite(remaining))return {changed:false,sound:null};
 let changed=false;let sound=null;
 const mark=(key)=>{if(rest[key])return false;rest[key]=true;changed=true;return true;};
 if(remaining<=0){
   for(const key of ['warned30','count3','count2','count1'])mark(key);
   if(mark('beeped0'))sound='ready';
 }else if(remaining<=1000){
   for(const key of ['warned30','count3','count2'])mark(key);
   if(mark('count1'))sound='countdown';
 }else if(remaining<=2000){
   for(const key of ['warned30','count3'])mark(key);
   if(mark('count2'))sound='countdown';
 }else if(remaining<=3000){
   mark('warned30');if(mark('count3'))sound='countdown';
 }else if(remaining<=30000){
   if(mark('warned30')&&remaining>25000)sound='warning30';
 }
 return {changed,sound};
}
