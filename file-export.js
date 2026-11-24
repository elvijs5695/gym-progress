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
    bridge.saveTextDocument(filename,String(mime),text);
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
