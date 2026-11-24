/** Single shared pace rule for visual Tracker progress and Android delivery. */
export function trackerPace(item,at=new Date()){
 const parseTime=v=>{const [h,m]=String(v||'').split(':').map(Number);return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0);};
 const start=parseTime(item.productiveStart||'08:00'),end=Math.max(start+1,parseTime(item.productiveEnd||'22:00')),cur=at.getHours()*60+at.getMinutes(),span=end-start;
 const target=Math.max(.01,Number(item.targetAmount||0)),increment=Math.max(.01,Number(item.increment||1)),steps=Math.max(1,Math.ceil((target-1e-9)/increment));
 const timeFraction=Math.max(0,Math.min(1,(cur-start)/span));let dueSteps=0,slot=0;
 if(cur>=end){dueSteps=steps;slot=steps>span/60?6:steps;}
 else if(cur>start){const elapsed=cur-start;if(steps>span/60){const checkpointCount=6,checkpointSpan=span/checkpointCount,checkpoint=Math.min(checkpointCount,Math.floor(elapsed/checkpointSpan+1e-9));dueSteps=checkpoint>0?Math.floor((steps*checkpoint)/checkpointCount+1e-9):0;slot=checkpoint;}
 else {const interval=span/steps;dueSteps=Math.floor(elapsed/interval+1e-9);slot=dueSteps;}}
 dueSteps=Math.max(0,Math.min(steps,dueSteps));const dueAmount=cur>=end?target:Math.min(target,dueSteps*increment);
 return{start,end,cur,target,increment,steps,dueSteps,dueAmount,slot,timeFraction};
}
