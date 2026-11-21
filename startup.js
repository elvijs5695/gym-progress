// This fallback works even when another app module cannot load.
let startupLanguage=String(navigator.language||'').toLowerCase().startsWith('lv')?'lv':'en';
try{startupLanguage=localStorage.getItem('gym-progress-language-v2')||startupLanguage;}catch{}
document.documentElement.lang=startupLanguage==='lv'?'lv':'en';
// A startup failure must leave a usable recovery route, without injecting error HTML.
window.addEventListener('error',event=>{
 const app=document.getElementById('app');if(!app||app.childElementCount)return;
 const card=document.createElement('main');card.className='view';const title=document.createElement('h1');title.textContent='Gym Progress';
 const lv=document.documentElement.lang==='lv',note=document.createElement('p');note.textContent=lv?'Lietotnes failus neizdevās ielādēt.':'App files could not load.';
 const recovery=document.createElement('a');recovery.href='./recovery.html';recovery.textContent=lv?'Atvērt atkopšanu':'Open recovery';card.append(title,note,recovery);app.append(card);
},true);
try{document.documentElement.dataset.theme=localStorage.getItem('gym-progress-ui-theme-v2')||'system';}catch{}
