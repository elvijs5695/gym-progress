import {trackerPace} from './tracker-pace.js';
/** Persistent Android reminders are scheduled by the OS, not by WebView ticks.
 * JS owns the actual Tracker pacing rule; Android only repeats its calculated
 * time-of-day checkpoints and posts notifications. The plan is replaced after
 * every saved change, logout, permission change or fresh app start.
 */
export function nativeReminderPlan(state,{scope='guest',trackerEnabled=true,now=new Date(),language='en'}={}){
 const lv=language==='lv',events=[],soundEnabled=state?.app_state?.soundEnabled!==false;
 if(trackerEnabled){
  for(const item of state?.tracker_items||[]){
   if(item.enabled===false||item.archived===true)continue;
   const pace=trackerPace(item,now),count=Math.min(pace.steps> (pace.end-pace.start)/60?6:pace.steps,12);
   if(count<1)continue;
   const daily=state.tracker_states?.find(s=>String(s.itemId)===String(item.id)),key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
   const amount=daily&&daily.localDate===key?Number(daily.amount||0):0;
   for(let n=1;n<=count;n++){
    const dueMinute=Math.round(pace.start+(pace.end-pace.start)*(n/count));
    const when=new Date(now.getFullYear(),now.getMonth(),now.getDate(),Math.floor(dueMinute/60),dueMinute%60,0,0);
    const checkpoint=trackerPace(item,new Date(when.getTime()+61000));
    const dueAmount=checkpoint.dueAmount;
    if(dueAmount<=0)continue;
    const id=`tracker/${item.id}/${n}`;
    events.push({id,type:'tracker',hour:Math.floor(dueMinute/60)%24,minute:dueMinute%60,skipToday:amount+1e-6>=dueAmount,
     title:`Gym Progress · ${String(item.name).slice(0,60)}`,
     body:lv?`Dienas mērķis: ${dueAmount} / ${pace.target}${item.unit?' '+item.unit:''}`:`Today's pace: ${dueAmount} / ${pace.target}${item.unit?' '+item.unit:''}`,
     sound:false,planDay:key});
   }
  }
 }
 const settings=state?.app_state||{};
 if(settings.motivationEnabled){
  const nextAt=Number(settings.nextSessionAt||0);
  if(nextAt>0){const date=new Date(nextAt),p=t=>{const m=/^(\d{2}):(\d{2})$/.exec(t||'');return m?[Number(m[1]),Number(m[2])]:[8,0];};
   const [eh,em]=p(settings.eveningReminderTime||'19:00'),[mh,mm]=p(settings.morningReminderTime||'08:00');
   const evening=new Date(date.getFullYear(),date.getMonth(),date.getDate()-1,eh,em).getTime(),morning=new Date(date.getFullYear(),date.getMonth(),date.getDate(),mh,mm).getTime();
   if(evening>now.getTime())events.push({id:'workout-evening/'+nextAt,type:'workout',at:evening,title:lv?'Rīt treniņš':'Gym tomorrow',body:lv?'Rīt ieplānots treniņš.':'You have a planned workout tomorrow.',sound:false});
   if(morning>now.getTime())events.push({id:'workout-morning/'+nextAt,type:'workout',at:morning,title:lv?'Šodien treniņš':'Gym today',body:lv?'Šodien ieplānots treniņš.':'Your workout is scheduled for today.',sound:false});
  }
  const completed=(state?.workout_sessions||[]).filter(s=>s.status==='COMPLETE'||s.status==='ABORTED').map(s=>Number(s.endedAt||s.startedAt||0)).filter(Number.isFinite);
  if(completed.length){const last=Math.max(...completed),due=last+Number(settings.inactivityReminderHours||72)*3600000;
   if(due>now.getTime())events.push({id:'inactivity/'+last,type:'inactivity',at:due,title:lv?'Laiks treniņam?':'Ready for another session?',body:lv?'Laiks atgriezties treniņā.':'Time to plan another workout.',sound:false});}
 }
 return {scope,events:events.slice(0,96)};
}
export function syncNativeReminderPlan(plan,bridge=globalThis.GymProgressAndroid){
 if(!bridge||typeof bridge.syncReminders!=='function')return 'browser';
 try{return String(bridge.syncReminders(JSON.stringify(plan)));}catch{return 'bridge-error';}
}
