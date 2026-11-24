/** Confirmed cloud-account deletion receipts survive a failed local storage cleanup. */
const KEY='gym-progress-v2-production-pending-account-cleanup';
const memory=new Set();
const valid=scope=>typeof scope==='string'&&/^account:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(scope);
export function pendingAccountCleanups(){let saved=[];try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(value))saved=value;}catch{}return [...new Set([...saved,...memory])].filter(valid);}
export function markAccountCleanup(scope){if(!valid(scope))throw new Error('Invalid cleanup workspace');memory.add(scope);localStorage.setItem(KEY,JSON.stringify(pendingAccountCleanups()));}
export function clearAccountCleanup(scope){memory.delete(scope);localStorage.setItem(KEY,JSON.stringify(pendingAccountCleanups().filter(value=>value!==scope)));}
