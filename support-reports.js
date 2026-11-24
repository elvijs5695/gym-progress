/** Explicit, privacy-limited support submissions.
 * No background telemetry, workout records, email addresses or OAuth tokens.
 * The backend owns rate limits and idempotency; the frontend merely validates UI.
 */
const KINDS=new Set(['bug','feedback']);
const DIAGNOSTIC_KEYS=new Set(['version','platform','locale','screen','pending_count','orphan_count','conflict_count']);
export function validateSupportMessage(kind,message){
 if(!KINDS.has(kind))throw new Error('Unsupported report type.');
 const text=String(message??'').trim();
 if(text.length<10||text.length>3000)throw new Error('Please enter 10–3000 characters.');
 return text;
}
export function supportDiagnostics({version='',platform='',locale='',screen='',pending_count='',orphan_count='',conflict_count=''}={}){
 const input={version,platform,locale,screen,pending_count,orphan_count,conflict_count};
 const out={};
 for(const [key,value] of Object.entries(input))if(DIAGNOSTIC_KEYS.has(key)&&(typeof value==='string'||typeof value==='number')&&String(value).trim())out[key]=String(value).trim().slice(0,80);
 return out;
}
export async function sendSupportReport(rpc,{kind,message,requestId,includeDiagnostics=false,diagnostics={}}){
 const clean=validateSupportMessage(kind,message);
 if(!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(String(requestId||'')))throw new Error('Unable to create a report ID.');
 const result=await rpc('gp_submit_support_report',{
   p_kind:kind,p_message:clean,p_request_id:requestId,
   p_diagnostics:includeDiagnostics?supportDiagnostics(diagnostics):{}
 });
 if(!result?.accepted||typeof result.id!=='string')throw new Error('The server did not confirm the report.');
 return result;
}
