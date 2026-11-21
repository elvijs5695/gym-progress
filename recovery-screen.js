import {setWorkspace} from './db.js';
import {createBackup} from './data-contract.js';
import {socialUser} from './social-api.js';
import {languageCode,t,localizeDom} from './i18n.js';
import {readOriginalLocalState,originalLocalBackup} from './legacy-local.js';
const status=document.getElementById('recovery-status'),button=document.getElementById('export-recovery'),oldButton=document.getElementById('export-original');
let lang=document.documentElement.lang==='lv'?'lv':'en';
try{lang=localStorage.getItem('gym-progress-language-v2')==='lv'?'lv':lang;document.documentElement.dataset.theme=localStorage.getItem('gym-progress-ui-theme-v2')||'system';}catch{}
const localize=()=>{document.documentElement.lang=lang;document.title='Gym Progress · '+t('Recovery',lang);localizeDom(document.body,lang);};
const download=(value,name)=>{const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);};
localize();
try{
 const user=socialUser(),state=await setWorkspace(user?'account:'+user.id:'guest');
 if(state)lang=languageCode(state);localize();
 status.textContent=t(state?'The current workspace can be exported.':'This workspace is empty.',lang);button.disabled=!state;
 button.addEventListener('click',()=>download(createBackup(state),'GymProgress-v2-recovery.json'));
}catch(error){status.textContent=t(error.message,lang);}
oldButton.addEventListener('click',async()=>{
 try{const old=await readOriginalLocalState();if(!old){status.textContent=t('No original local data found.',lang);return;}download(originalLocalBackup(old),'GymProgress-original-local-backup.json');status.textContent=t('Original local data exported.',lang);}
 catch{status.textContent=t('The original local database could not be read.',lang);}
});
