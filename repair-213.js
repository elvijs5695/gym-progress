/**
 * Dependency-free browser recovery for any installed release. The old service
 * worker may serve cached modules. Do NOT import other modules:
 * old workers may hand an import back from an obsolete release cache.
 * This page never removes caches, service workers or IndexedDB records.
 */
const status = document.getElementById('rescue-status');
const button = document.getElementById('rescue-check');
const say = (message) => { if (status) status.textContent = message; };
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const base = new URL('./', location.href);
const utf8 = new TextEncoder();

async function fetchUncached(path) {
  const url = new URL(path, base);
  // Both paths are deliberately *outside* old service workers' asset manifests.
  // A query string alone would NOT bypass their path-based cache interception.
  const response = await fetch(url, { cache: 'no-store', redirect: 'error' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}. The requested file is not available at this website address. Check the published release and Pages configuration.`);
  return response;
}

function isSha256(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }

async function checkLiveDeployment() {
  const workerScript=await (await fetchUncached('sw.js')).text();
  if(workerScript.includes('__RELEASE_MANIFEST__'))throw new Error('The published sw.js is an unbuilt template.');
  const declaration=workerScript.match(/(?:^|\n)const RELEASE=([^\n;]+);/);
  if(!declaration)throw new Error('No generated release manifest found in published sw.js.');
  let workerManifest;
  try{workerManifest=JSON.parse(declaration[1]);}
  catch{throw new Error('The published worker has invalid release metadata.');}
  if(!workerManifest||typeof workerManifest.version!=='string'||!/^\d+\.\d+\.\d+$/.test(workerManifest.version)||
     typeof workerManifest.id!=='string'||!workerManifest.id.startsWith(workerManifest.version+'-')||
     !Array.isArray(workerManifest.assets)||!workerManifest.assets.length)
    throw new Error('The published worker contains an incomplete or invalid release manifest.');
  const servedManifest=await (await fetchUncached('release.json')).json();
  if(JSON.stringify(servedManifest)!==JSON.stringify(workerManifest))
    throw new Error('Published release.json and sw.js disagree; please verify the GitHub Pages publishing target.');
  let proofStatus='missing';
  const proofResponse=await fetch(new URL('deployment-status.json',base),{cache:'no-store'});
  if(proofResponse.ok){
    const proof=await proofResponse.json();
    const digest=await crypto.subtle.digest('SHA-256',utf8.encode(workerScript));
    const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    if(proof.id!==workerManifest.id||proof.version!==workerManifest.version||proof.serviceWorkerSha256!==hash||proof.assetCount!==workerManifest.assets.length)
      throw new Error('The website contains conflicting deployment proof and worker files.');
    proofStatus='verified';
  }else if(proofResponse.status!==404){
    throw new Error('Unexpected deployment proof status HTTP '+proofResponse.status);
  }
  return {...workerManifest,proofStatus};
}

async function waitForCandidate(registration) {
  // Check origin first: an old waiting worker must NOT win over the latest release.
  await registration.update();
  const installing = registration.installing;
  if (!installing) return registration.waiting;
  if (!installing) return null;
  const started = Date.now();
  while (Date.now() - started < 20000) {
    if (installing.state === 'redundant') throw new Error('New worker installation failed; check the service worker console.');
    if (installing.state === 'installed') return registration.waiting;
    if (installing.state === 'activated') return registration.waiting;
    await delay(300);
  }
  return registration.waiting;
}

async function activeRelease(registration) {
  if (!registration.active) return null;
  const channel = new MessageChannel();
  let timeout;
  try {
    return await new Promise(resolve => {
      const done = value => { clearTimeout(timeout); resolve(value); };
      channel.port1.onmessage = event => done(event.data?.type === 'RELEASE_STATUS' ? event.data : null);
      timeout = setTimeout(() => done(null), 2000);
      try { registration.active.postMessage({ type: 'GET_RELEASE_STATUS' }, [channel.port2]); }
      catch { done(null); }
    });
  } finally { clearTimeout(timeout); channel.port1.close(); channel.port2.close(); }
}

async function activate(waiting) {
  const channel = new MessageChannel();
  let timeout, listener;
  try {
    await new Promise((resolve, reject) => {
      let accepted = false, controllerChanged = false, complete = false;
      const succeed = () => { if (!complete && accepted && controllerChanged) { complete = true; resolve(); } };
      const fail = message => { if (!complete) { complete = true; reject(new Error(message)); } };
      listener = () => { controllerChanged = true; succeed(); };
      navigator.serviceWorker.addEventListener('controllerchange', listener);
      channel.port1.onmessage = event => {
        const reply = event.data;
        if (reply?.type !== 'ACTIVATE_RELEASE_RESULT') return;
        if (!reply.ok) return fail(reply.code || 'ACTIVATION_FAILED');
        accepted = true; succeed();
      };
      timeout = setTimeout(() => fail('UPDATE_TIMEOUT'), 25000);
      waiting.postMessage({ type: 'ACTIVATE_RELEASE', workoutActive: false, unsavedChanges: false }, [channel.port2]);
    });
  } finally {
    clearTimeout(timeout);
    if (listener) navigator.serviceWorker.removeEventListener('controllerchange', listener);
    channel.port1.close(); channel.port2.close();
  }
}

navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type === 'CHECK_UPDATE_STATE' && event.ports?.[0]) {
    // The rescue page never contains an editable workout or unsaved training data.
    event.ports[0].postMessage({ type: 'UPDATE_STATE', safe: true });
  }
});

button?.addEventListener('click', async () => {
  button.disabled = true;
  try {
    if (!('serviceWorker' in navigator)) throw new Error('This browser does not support service workers.');
    say('Checking the actual GitHub Pages deployment (not the old offline cache)…');
    const live = await checkLiveDeployment();
    say('Verified server release ' + live.id + '. Checking Firefox service worker…');
    const registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
    const waiting = await waitForCandidate(registration);
    if (!waiting) {
      const active = await activeRelease(registration);
      if (active?.id === live.id) {
        say('Your browser already has verified ' + live.version + '. Opening the app…');
        location.replace('./index.html');
        return;
      }
      throw new Error('No verified worker is ready to activate. Its installation may have failed or be running. Check the browser service-worker console. The current workspace is unchanged.');
    }
    const pending = await (async () => {
      const channel = new MessageChannel(); let timeout;
      try { return await new Promise(resolve => {
        channel.port1.onmessage = event => { clearTimeout(timeout); resolve(event.data); };
        timeout = setTimeout(() => resolve(null), 2500);
        waiting.postMessage({type:'GET_RELEASE_STATUS'}, [channel.port2]);
      }); } finally { clearTimeout(timeout); channel.port1.close(); channel.port2.close(); }
    })();
    if (pending?.type !== 'RELEASE_STATUS' || pending.id !== live.id)
      throw new Error('The waiting worker does not match published release ' + live.id + '. Refusing to install an obsolete release.');
    say('New release is downloaded and verified. Confirming that all app tabs are idle…');
    await activate(waiting);
    say('Verified release activated. Opening Gym Progress…');
    location.replace('./index.html');
  } catch (error) {
    const code = String(error?.message || error);
    if (code === 'OTHER_WINDOW_BUSY' || code === 'UNCONFIRMED_WINDOW')
      say('Another Gym Progress tab cannot confirm that it is idle. Close all other Gym Progress tabs and app windows on this device. No data has been cleared.');
    else if (code === 'UPDATE_TIMEOUT')
      say('Activation was not confirmed. No data was cleared. Close other app windows and revisit this page; an install may already have succeeded.');
    else say('Update blocked: ' + code + ' Your local training data has not been deleted.');
  } finally { button.disabled = false; }
});
