/** UTC filename timestamp for portable Windows/Android/browser exports. */
export function exportFilenameStamp(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new TypeError('Invalid export timestamp');
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * Shared text export adapter. Neither platform alters the user data. On Android,
 * SAF handles the destination; in a browser a standards-based download is used.
 * The native bridge is exposed only by the first-party Android WebView host.
 */
export function exportTextFile(name, content, mime = 'application/json') {
  const filename=String(name||'gym-progress-export.json').replace(/[\\/\x00-\x1f]/g,'_');
  const text=String(content);
  const bridge=globalThis.GymProgressAndroid;
  if(bridge && typeof bridge.saveTextDocument === 'function') {
    // The Android bridge rejects payloads above 8 MiB. Never silently report
    // a save request as successful when it cannot even be sent.
    if(text.length > 8*1024*1024) {
      globalThis.alert?.('Export exceeds the current Android file-save limit (8 MiB). Use the browser version to export a large backup.');
      return 'android-too-large';
    }
    try {
      const request=bridge.saveTextDocument(filename,String(mime),text);
      if(request && typeof request.catch==='function') {
        void request.catch(error=>{
          console.warn('Android export request failed',error);
          globalThis.alert?.('The Android export could not be opened. Please try again; large backups may exceed the Android bridge limit.');
        });
      }
    }catch(error){
      console.warn('Android export request failed',error);
      globalThis.alert?.('The Android export could not be opened. Please try again.');
    }
    return 'android';
  }
  const blob=new Blob([text],{type:String(mime)+';charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try {
    const link=document.createElement('a');
    link.href=url;
    link.download=filename;
    link.rel='noopener';
    link.style.display='none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {setTimeout(()=>URL.revokeObjectURL(url),30000);}
  return 'browser';
}
