/** Shared presentation helpers. No training, account or sync records are changed here. */
import {localizeDom, message} from './i18n.js';

const THEME_KEY = 'gym-progress-ui-theme-v2';
const THEMES = new Set(['system', 'light', 'dark']);
const FOCUSABLE = 'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])';
const USER_CONTENT = '[data-user-content],[translate="no"],.notranslate';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let settings = {getLanguage: () => 'en', onThemeChange: null, closeDialog: null, onReorder: null};
let selectedTheme = 'system';
let initialized = false;
let media = null;
let mediaListener = null;
let dialogObserver = null;
let dialogState = null;
let lastDialog = null;
let eventController = null;
let idSequence = 0;
const composing = new Set();
const deferredRenders = new Map();
const locale = () => settings.getLanguage?.() === 'lv' ? 'lv' : 'en';
const tr = key => message(key, locale());

function all(root, selector) {
  if (!root?.querySelectorAll) return [];
  const elements = [...root.querySelectorAll(selector)];
  if (root.matches?.(selector)) elements.unshift(root);
  return elements;
}
function query(root, selector) { try { return root?.querySelector?.(selector) ?? null; } catch { return null; } }
function isVisible(el) {
  if (!el?.isConnected || el.closest('[hidden],[inert],.hidden')) return false;
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  return style?.display !== 'none' && style?.visibility !== 'hidden';
}
function canFocus(el) { return isVisible(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true'; }
function focus(el) {
  if (!el || !canFocus(el)) return false;
  try { el.focus({preventScroll:true}); return el.ownerDocument.activeElement === el; } catch { return false; }
}
function setAttrIfMissing(el, name, value) { if (!el.hasAttribute(name)) el.setAttribute(name, value); }
function stableKey(el, root) {
  if (!el || !root?.contains(el)) return null;
  if (el.dataset.focusKey) return {by:'focus', value:el.dataset.focusKey};
  if (el.id) return {by:'id', value:el.id};
  if (el.name) return {by:'name', value:el.name, type:el.type || '', valueKey:el.type === 'radio' ? el.value : null};
  const tag = el.localName;
  return {by:'index', tag, index:all(root, tag).indexOf(el)};
}
function resolveKey(root, key) {
  if (!key) return null;
  // Compare attribute values as data. Never interpolate a user name into a selector.
  if (key.by === 'focus') return all(root, '[data-focus-key]').find(el => el.dataset.focusKey === key.value) || null;
  if (key.by === 'id') return all(root, '[id]').find(el => el.id === key.value) || null;
  if (key.by === 'name') return all(root, '[name]').find(el => el.name === key.value && (el.type || '') === key.type && (key.valueKey == null || el.value === key.valueKey)) || null;
  return all(root, key.tag)[key.index] || null;
}
function inputSnapshot(el, root) {
  if (!el?.matches('input:not([type="password"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]),textarea')) return null;
  const snapshot = {key:stableKey(el,root), value:el.value};
  try { snapshot.start=el.selectionStart; snapshot.end=el.selectionEnd; snapshot.direction=el.selectionDirection; } catch {}
  return snapshot;
}

/** Escaped user content is excluded from all automatic UI translation. */
export function userText(value, className = '') {
  return `<span data-user-content translate="no"${className ? ` class="${esc(className)}"` : ''}>${esc(value)}</span>`;
}
export const userContentHTML = userText;

/** Render plain label text; no caller-provided HTML or inline event attributes. */
export function buttonHTML({label='',action='',className='secondary',id='',disabled=false,ariaLabel='',data={}} = {}) {
  const attrs = Object.entries(data).filter(([key]) => /^[a-z][a-z0-9-]*$/.test(key)).map(([key,value]) => ` data-${key}="${esc(value)}"`).join('');
  return `<button type="button"${id?` id="${esc(id)}"`:''} class="${esc(className)}"${action?` data-ui-action="${esc(action)}"`:''}${ariaLabel?` aria-label="${esc(ariaLabel)}"`:''}${disabled?' disabled':''}${attrs}>${esc(label)}</button>`;
}
export function fieldHTML({id,label,value='',type='text',inputmode='',help='',error='',required=false,placeholder='',min,max,step,maxlength} = {}) {
  if (!id) throw new TypeError('fieldHTML requires a stable id');
  const safeType = ['text','number','email','date','time','url','search','tel'].includes(type) ? type : 'text';
  const description = [help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  const attrs = Object.entries({min,max,step,maxlength}).filter(([,v]) => v != null).map(([k,v]) => ` ${k}="${esc(v)}"`).join('');
  return `<div class="form-field"><label class="field" for="${esc(id)}">${esc(label)}</label><input id="${esc(id)}" type="${safeType}" value="${esc(value)}"${inputmode?` inputmode="${esc(inputmode)}"`:''}${placeholder?` placeholder="${esc(placeholder)}"`:''}${required?' required':''}${description?` aria-describedby="${esc(description)}"`:''}${error?' aria-invalid="true"':''}${attrs}>${help?`<p class="field-help" id="${esc(id)}-help">${esc(help)}</p>`:''}${error?`<p class="field-error" id="${esc(id)}-error" role="alert">${esc(error)}</p>`:''}</div>`;
}

export function getTheme() { return selectedTheme; }
export function resolvedTheme() { return selectedTheme === 'system' ? (media?.matches ? 'dark' : 'light') : selectedTheme; }
export function themeColour(name) {
  if (typeof document === 'undefined' || !/^[a-z][a-z0-9-]*$/.test(name)) return '';
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}
function applyTheme({notify=false} = {}) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = selectedTheme;
  document.documentElement.dataset.resolvedTheme = resolvedTheme();
  const background = themeColour('bg');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && background) meta.content = background;
  document.querySelectorAll('[data-ui-theme]').forEach(input => { input.checked = input.value === selectedTheme; });
  if (notify) document.dispatchEvent(new CustomEvent('gp:themechange', {detail:{theme:selectedTheme,resolved:resolvedTheme()}}));
}
export function setTheme(value, {persist=true, notify=true} = {}) {
  if (!THEMES.has(value)) return false;
  const changed = selectedTheme !== value;
  selectedTheme = value;
  if (persist) { try { localStorage.setItem(THEME_KEY, value); } catch {} }
  applyTheme({notify:notify && changed});
  if (notify && changed) settings.onThemeChange?.(value);
  return true;
}
export function themePickerHTML(language = locale()) {
  const icons = {
    system:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    light:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    dark:'<path d="M20.5 14a8.5 8.5 0 0 1-10.5-10.5A8.5 8.5 0 1 0 20.5 14Z"/>'
  };
  return `<fieldset class="theme-picker"><legend data-i18n="appearance.theme">${esc(message('appearance.theme',language))}</legend><div class="theme-options">${['system','light','dark'].map(value => `<label class="theme-option"><input type="radio" name="ui-theme" data-ui-theme value="${value}"${selectedTheme===value?' checked':''}><svg viewBox="0 0 24 24" aria-hidden="true">${icons[value]}</svg><span data-i18n="appearance.${value}">${esc(message(`appearance.${value}`,language))}</span></label>`).join('')}</div></fieldset>`;
}

/** Preserve only ephemeral UI state, not application records. Scope must identify a view/phase. */
export function captureUIState(root, {scope} = {}) {
  if (!root) return null;
  const doc = root.ownerDocument;
  const active = root.contains(doc.activeElement) ? doc.activeElement : null;
  const scrollables = all(root, '.dialog,.segmented,.alternative-list,.data-table-wrap,[data-preserve-scroll]');
  const drafts = all(root, 'input[data-ui-dirty="true"],textarea[data-ui-dirty="true"],input[data-preserve-input],textarea[data-preserve-input]').map(el => inputSnapshot(el,root)).filter(Boolean);
  if (active && !drafts.some(s => resolveKey(root,s.key)===active)) {
    const focusedDraft = inputSnapshot(active,root); if (focusedDraft) drafts.push(focusedDraft);
  }
  return {
    scope:String(scope ?? root.dataset?.uiScope ?? ''), focus:stableKey(active,root), drafts,
    x:doc.defaultView?.scrollX || 0, y:doc.defaultView?.scrollY || 0,
    scroll:scrollables.map(el => ({key:stableKey(el,root),x:el.scrollLeft,y:el.scrollTop})),
    details:all(root,'details').map(el => ({key:stableKey(el,root),open:el.dataset.disclosureTarget == null ? el.open : el.dataset.disclosureTarget==='true'})),
    disclosures:all(root,'[data-disclosure-key]').map(el => ({key:el.dataset.disclosureKey,expanded:el.dataset.expanded==='true',height:el.getBoundingClientRect().height}))
  };
}
export function restoreUIState(root, snapshot, {scope,restoreFocus=true,restoreScroll=true,restoreInputs=true} = {}) {
  if (!root || !snapshot || String(scope ?? root.dataset?.uiScope ?? '') !== snapshot.scope) return false;
  for (const item of snapshot.details) { const el=resolveKey(root,item.key); if (el?.localName==='details') el.open=item.open; }
  if (restoreInputs) for (const draft of snapshot.drafts) {
    const el=resolveKey(root,draft.key);
    if (!el?.matches('input,textarea') || el.type === 'file' || el.type === 'password' || el.dataset.resetDraft === 'true') continue;
    el.value=draft.value; el.dataset.uiDirty='true';
  }
  if (restoreFocus) {
    const el=resolveKey(root,snapshot.focus);
    if (focus(el)) {
      const draft=snapshot.drafts.find(s => resolveKey(root,s.key)===el);
      if (draft?.start != null) { try { el.setSelectionRange(draft.start,draft.end,draft.direction || 'none'); } catch {} }
    }
  }
  if (restoreScroll) {
    for (const saved of snapshot.scroll) { const el=resolveKey(root,saved.key); if(el){el.scrollLeft=saved.x;el.scrollTop=saved.y;} }
    try { root.ownerDocument.defaultView?.scrollTo(snapshot.x,snapshot.y); } catch {}
  }
  animateDisclosures(root,snapshot.disclosures || []);
  return true;
}
export function isComposing(root) { return [...composing].some(el => root?.contains(el)); }
/** At the start of a full render: if(deferWhileComposing(appEl,render)) return. */
export function deferWhileComposing(root, render) {
  if (!isComposing(root)) return false;
  deferredRenders.set(root,render); return true;
}

/** Bind existing visible labels without rewriting inputs, values or user copy. */
export function bindFieldLabels(root) {
  let fieldIndex=0;
  const prefix=`ui-${root.id || 'view'}`;
  all(root,'input,select,textarea').forEach(control => {
    fieldIndex++;
    if (control.type==='hidden' || control.type==='file') return;
    if (!control.id) {
      let id=`${prefix}-field-${fieldIndex}`;
      if (control.ownerDocument.getElementById(id)) id+=`-${++idSequence}`;
      control.id=id;
    }
    if (control.labels?.length || control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return;
    let candidate=control.previousElementSibling;
    if (!candidate?.matches('label.field,.field,.field-label')) {
      const group=control.closest('.cardio-optional-field,.field-control,.input-group');
      candidate=group?.previousElementSibling || candidate;
    }
    if (candidate?.matches('label.field,.field,.field-label')) {
      if (candidate.localName==='label') candidate.htmlFor=control.id;
      else { candidate.id ||= `${control.id}-label`; control.setAttribute('aria-labelledby',candidate.id); }
      return;
    }
    const setting=control.closest('.card-row,.setting-toggle-row,.sync-domain-row');
    const label=setting?.querySelector('.setting-toggle-copy,.title');
    if (label) { label.id ||= `${control.id}-label`; control.setAttribute('aria-labelledby',label.id); }
  });
  all(root,'.cardio-validation-error,.field-error').forEach(el => { setAttrIfMissing(el,'role','alert'); });
}

function enhanceButtons(root) {
  const known = [
    ['deleteWorkout','actions.deleteWorkout'], ['deleteExercise','actions.deleteExercise'],
    ['customWeight','actions.editWeight'], ['requestAbort','actions.endWorkout'],
    ['adjustWeight(-1)','actions.decreaseWeight'], ['adjustWeight(1)','actions.increaseWeight'],
    ['adjustEntryReps(-1)','actions.decreaseReps'], ['adjustEntryReps(1)','actions.increaseReps'],
    ['setCatalogueLinkForExercise','actions.catalogueLink'], ['closeDialog','actions.close']
  ];
  all(root,'button').forEach(button => {
    setAttrIfMissing(button,'type','button');
    if (button.dataset.route) {
      if(button.classList.contains('active')) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    }
    if (button.closest('.rir-row,.progress-metrics')) button.setAttribute('aria-pressed',String(button.classList.contains('active')));
    if (button.hasAttribute('aria-label')) return;
    const source=button.getAttribute('onclick') || button.getAttribute('data-action-click') || '';
    const match=known.find(([code]) => source.includes(code));
    if (match) button.setAttribute('aria-label',tr(match[1]));
    else if(button.classList.contains('icon-btn') && button.textContent.trim()==='‹') button.setAttribute('aria-label',tr('actions.back'));
    else if(button.classList.contains('icon-btn') && button.textContent.trim()==='×') button.setAttribute('aria-label',tr('actions.close'));
  });
  all(root,'.nav').forEach(el => setAttrIfMissing(el,'aria-label',tr('navigation.main')));
  all(root,'.rir-row').forEach(el => {setAttrIfMissing(el,'role','group');setAttrIfMissing(el,'aria-label',tr('workout.rir'));});
  all(root,'.progress-metrics').forEach(el => {setAttrIfMissing(el,'role','group');setAttrIfMissing(el,'aria-label',tr('progress.metric'));});
  all(root,'.live-rest-time,.live-timed-set,.live-countup').forEach(el => {setAttrIfMissing(el,'role','timer');setAttrIfMissing(el,'aria-live','off');});
}

function enhancePressables(root) {
  const selectors='.workout-row-inner:is([onclick],[data-action-click]),.programme-day:is([onclick],[data-action-click]),.superset-exercise-subrow:is([onclick],[data-action-click]),.log-session-card:is([onclick],[data-action-click]),.weight-value:is([onclick],[data-action-click]),[data-ui-pressable-target]';
  all(root,selectors).forEach(el => {
    if(el.dataset.uiPressable) return;
    el.dataset.uiPressable='true';
    if (el.querySelector('button,a,input,select,textarea,[role="button"]')) {
      const title=el.querySelector('.title');
      if (!title || title.querySelector('button')) return;
      const button=el.ownerDocument.createElement('button');
      button.type='button'; button.className='ui-card-open';
      while(title.firstChild) button.appendChild(title.firstChild);
      title.appendChild(button);
      button.addEventListener('click',event=>{event.stopPropagation();el.click();});
      if(el.classList.contains('workout-row-inner')) button.setAttribute('aria-expanded',String(el.closest('.workout-row')?.classList.contains('expanded') || false));
    } else {
      setAttrIfMissing(el,'tabindex','0'); setAttrIfMissing(el,'role','button');
      el.addEventListener('keydown',event=>{
        if(event.target!==el || (event.key!=='Enter'&&event.key!==' ')) return;
        event.preventDefault(); el.click();
      });
    }
  });
}

function enhanceReorder(root) {
  if (typeof settings.onReorder!=='function') return;
  const grips=all(root,'.drag-grip[data-reorder-kind][data-reorder-id]');
  for(const grip of grips) {
    const row=grip.closest('.reorder-row');
    if(!row) continue;
    const kind=grip.dataset.reorderKind, id=grip.dataset.reorderId;
    const name=row.querySelector('.title')?.textContent.trim() || '';
    grip.dataset.focusKey=`reorder:${kind}:${id}`;
    grip.setAttribute('role','button');grip.tabIndex=0;
    grip.setAttribute('aria-label',`${tr('actions.reorder')} ${name}`);
    grip.setAttribute('aria-keyshortcuts','Alt+ArrowUp Alt+ArrowDown');
    grip.title=locale()==='lv'?'Velc vai izmanto Alt + bultiņu augšup/lejup.':'Drag or use Alt + Up/Down Arrow.';
    if(grip.dataset.uiReorder) continue;
    grip.dataset.uiReorder='true';
    grip.addEventListener('keydown',event=>{
      if(!event.altKey || !['ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault();event.stopPropagation();
      const siblings=all(root,'.drag-grip[data-reorder-kind][data-reorder-id]').filter(other=>other.dataset.reorderKind===kind);
      const index=siblings.indexOf(grip),delta=event.key==='ArrowUp'?-1:1;
      if(index>=0 && index+delta>=0 && index+delta<siblings.length) settings.onReorder(kind,id,delta);
    });
  }
}

function reducedMotion(root) { return root.ownerDocument.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true; }
/** Re-rendered disclosure bodies retain their content and animate only their height. */
function animateDisclosures(root,previous) {
  if(reducedMotion(root)) return;
  for(const el of all(root,'[data-disclosure-key]')) {
    const old=previous.find(item=>item.key===el.dataset.disclosureKey),expanded=el.dataset.expanded==='true';
    if(!old || old.expanded===expanded || typeof el.animate!=='function') continue;
    const from=old.height,to=el.getBoundingClientRect().height;
    if(!Number.isFinite(from)||!Number.isFinite(to)||Math.abs(to-from)<1) continue;
    el.animate([{height:`${from}px`},{height:`${to}px`}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
  }
}

/** Native details remains keyboard-operable; closing keeps the body until motion finishes. */
function enhanceDetails(root) {
  for(const details of all(root,'details')) {
    const summary=details.querySelector(':scope > summary');
    if(!summary || details.dataset.uiDisclosure) continue;
    details.dataset.uiDisclosure='true';
    let animation=null;
    summary.addEventListener('click',event=>{
      if(event.target.closest('button,a,input,select,textarea')) return;
      if(reducedMotion(details)||typeof details.animate!=='function') return;
      event.preventDefault();
      const opening=details.dataset.disclosureTarget == null ? !details.open : details.dataset.disclosureTarget!=='true';
      const from=details.getBoundingClientRect().height;
      animation?.cancel();
      details.dataset.disclosureTarget=String(opening);
      details.open=true;
      const style=details.ownerDocument.defaultView.getComputedStyle(details),edge=(parseFloat(style.paddingTop)||0)+(parseFloat(style.paddingBottom)||0)+(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0);
      const to=opening?details.scrollHeight+(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0):summary.getBoundingClientRect().height+edge;
      details.style.overflow='hidden';
      const active=details.animate([{height:`${from}px`},{height:`${to}px`}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'});
      animation=active;
      active.onfinish=()=>{if(animation!==active)return;details.open=opening;details.style.removeProperty('overflow');delete details.dataset.disclosureTarget;animation=null;};
    });
  }
}

/** One set of semantic text/control roles for retained settings and newer components. */
function enhanceItems(root) {
  all(root,'.setting-toggle-row,.compare-checkbox-row,.sync-domain-row,.setting-stepper').forEach(el=>el.classList.add('ui-item'));
  all(root,'.setting-toggle-copy > strong,.setting-toggle-copy > .title,.setting-stepper > span:first-child,.compare-checkbox-row strong,.card > .title,.card > div > .title,summary strong').forEach(el=>el.classList.add('ui-item-title'));
  all(root,'.setting-toggle-copy > small,.compare-checkbox-row small,.subtitle,.field-help').forEach(el=>el.classList.add('ui-item-description'));
  all(root,'.setting-toggle-row > span:not([class]),.sync-domain-row > span:first-child').forEach(el=>el.classList.add('ui-item-title'));
  all(root,'input[type="checkbox"],input[type="radio"],.setting-toggle-control,.share-toggle').forEach(el=>el.classList.add('ui-item-control'));
  all(root,'.dialog-copy,.destructive-warning,.field-error,.cardio-validation-error').forEach(el=>el.classList.add('ui-message'));
  all(root,'.share-toggle').forEach(el=>el.setAttribute('aria-pressed',String(el.classList.contains('on'))));
}

export function enhanceUI(root, {language=locale(),route,scope} = {}) {
  if(!root) return;
  if(scope != null || route != null) root.dataset.uiScope=String(scope ?? (typeof route==='string'?route:`${route.name || ''}:${route.id ?? ''}`));
  localizeDom(root,language);
  bindFieldLabels(root);
  enhanceButtons(root);
  enhancePressables(root);
  enhanceReorder(root);
  enhanceDetails(root);
  enhanceItems(root);
}

function rememberDialogOpener(dialogRoot) {
  const doc=dialogRoot.ownerDocument, win=doc.defaultView;
  const opener=doc.activeElement && !dialogRoot.contains(doc.activeElement) ? doc.activeElement : null;
  const app=doc.getElementById('app');
  return {opener,key:stableKey(opener,app),scope:app?.dataset.uiScope || '',x:win?.scrollX || 0,y:win?.scrollY || 0,
    bodyOverflow:doc.body.style.overflow,htmlOverflow:doc.documentElement.style.overflow,
    inert:[...doc.body.children].filter(el=>el!==dialogRoot && el.id!=='status-root' && !['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>({el,inert:el.inert,aria:el.getAttribute('aria-hidden')}))};
}
function lockDialogBackground(state, doc) {
  state.inert.forEach(({el})=>{el.inert=true;el.setAttribute('aria-hidden','true');});
  doc.body.style.overflow='hidden';doc.documentElement.style.overflow='hidden';
}
function releaseDialogBackground(dialogRoot) {
  if(!dialogState) return;
  const saved=dialogState, doc=dialogRoot.ownerDocument, app=doc.getElementById('app');
  dialogState=null;lastDialog=null;
  saved.inert.forEach(({el,inert,aria})=>{el.inert=inert;if(aria==null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',aria);});
  doc.body.style.overflow=saved.bodyOverflow;doc.documentElement.style.overflow=saved.htmlOverflow;
  if((app?.dataset.uiScope || '')===saved.scope) {
    const target=saved.opener?.isConnected?saved.opener:resolveKey(app,saved.key);
    focus(target);
    try{doc.defaultView?.scrollTo(saved.x,saved.y);}catch{}
  }
}
function requestDialogClose(dialog) {
  if(dialog.dataset.noDismiss==='true') return;
  const explicit=dialog.querySelector('[data-dialog-dismiss]');
  const legacy=[...dialog.querySelectorAll('button')].find(button=>/gp\.(?:cancelConfirm|closeShareSummary|closeDialog)\(/.test(button.getAttribute('onclick') || button.getAttribute('data-action-click') || ''));
  if(explicit || legacy) (explicit || legacy).click();
  else settings.closeDialog?.();
}
function trapDialogKey(event) {
  const dialog=lastDialog;
  if(!dialog?.isConnected) return;
  if(event.key==='Escape') {event.preventDefault();event.stopPropagation();requestDialogClose(dialog);return;}
  if(event.key!=='Tab') return;
  const focusable=[...dialog.querySelectorAll(FOCUSABLE)].filter(canFocus);
  if(!focusable.length) {event.preventDefault();focus(dialog);return;}
  const first=focusable[0],last=focusable.at(-1),active=dialog.ownerDocument.activeElement;
  if(!dialog.contains(active) || (event.shiftKey&&(active===first||active===dialog)) || (event.shiftKey&&!focusable.includes(active))) {event.preventDefault();focus(last);}
  else if(!event.shiftKey&&(active===last||!dialog.contains(active))) {event.preventDefault();focus(first);}
}
export function enhanceDialog(dialogRoot, {onClose,language=locale()} = {}) {
  if(!dialogRoot) return;
  if(onClose) settings.closeDialog=onClose;
  const dialog=dialogRoot.querySelector('.dialog,[role="dialog"],[role="alertdialog"]');
  if(!dialog) {releaseDialogBackground(dialogRoot);return;}
  const fresh=lastDialog!==dialog;
  if(!dialogState) {dialogState=rememberDialogOpener(dialogRoot);lockDialogBackground(dialogState,dialogRoot.ownerDocument);}
  setAttrIfMissing(dialog,'role','dialog');dialog.setAttribute('aria-modal','true');setAttrIfMissing(dialog,'tabindex','-1');
  const heading=dialog.querySelector('h2,h1,h3,.workout-complete-title');
  if(!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby')) {
    if(heading){heading.id ||= `ui-dialog-title-${++idSequence}`;dialog.setAttribute('aria-labelledby',heading.id);}
    else dialog.setAttribute('aria-label',message('dialog.title',language));
  }
  enhanceUI(dialogRoot,{language});
  if(fresh) {
    lastDialog=dialog;
    const selected=dialog.querySelector('[data-dialog-initial-focus],[autofocus]');
    // Focus the dialog container (aria-labelledby announces its title). Focusing
    // the h2 created an unwanted visible selection frame in WebView/Firefox.
    // Do not auto-open the keyboard for a search field unless explicitly requested.
    focus(selected || dialog);
  }
}

export function initUI(options = {}) {
  settings={...settings,...options};
  if(typeof document==='undefined') return;
  if(initialized) {applyTheme();return;}
  initialized=true;
  media=window.matchMedia?.('(prefers-color-scheme: dark)') || null;
  let saved=null;try{saved=localStorage.getItem(THEME_KEY);}catch{}
  selectedTheme=THEMES.has(saved)?saved:THEMES.has(options.theme)?options.theme:'system';
  applyTheme();
  mediaListener=()=>{if(selectedTheme==='system')applyTheme({notify:true});};
  if(media?.addEventListener) media.addEventListener('change',mediaListener); else media?.addListener?.(mediaListener);
  eventController=new AbortController(); const signal=eventController.signal;
  document.addEventListener('change',event=>{const input=event.target.closest?.('[data-ui-theme]');if(input)setTheme(input.value);},{signal});
  document.addEventListener('input',event=>{if(event.target.matches?.('input:not([type="password"]):not([type="file"]),textarea'))event.target.dataset.uiDirty='true';},{signal,capture:true});
  document.addEventListener('compositionstart',event=>{composing.add(event.target);},{signal,capture:true});
  document.addEventListener('compositionend',event=>{
    composing.delete(event.target);
    queueMicrotask(()=>{for(const[root,render]of deferredRenders){if(!isComposing(root)){deferredRenders.delete(root);render();}}});
  },{signal,capture:true});
  document.addEventListener('keydown',trapDialogKey,{signal,capture:true});
  window.addEventListener('storage',event=>{if(event.key===THEME_KEY)setTheme(THEMES.has(event.newValue)?event.newValue:'system',{persist:false});},{signal});
  const dialogRoot=document.getElementById('dialog-root');
  if(dialogRoot && typeof MutationObserver!=='undefined') {
    dialogObserver=new MutationObserver(()=>enhanceDialog(dialogRoot));
    dialogObserver.observe(dialogRoot,{childList:true});
    enhanceDialog(dialogRoot);
  }
}

/** Exposed for tests and app teardown; ordinary renders must not reinitialize UI. */
export function disposeUI() {
  dialogObserver?.disconnect();dialogObserver=null;
  if(typeof document!=='undefined') {const root=document.getElementById('dialog-root');if(root)releaseDialogBackground(root);}
  eventController?.abort();eventController=null;
  if(mediaListener){if(media?.removeEventListener)media.removeEventListener('change',mediaListener);else media?.removeListener?.(mediaListener);}
  mediaListener=null;media=null;
  composing.clear();deferredRenders.clear();initialized=false;
}

export function markUserContent(root) {
  all(root,USER_CONTENT).forEach(el=>{el.dataset.userContent='';el.setAttribute('translate','no');});
}
