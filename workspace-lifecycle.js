/** Serialises account/restore/erase transitions; lock changes before the first await. */
export function createWorkspaceLifecycle(onChange=()=>{}){
 let chain=Promise.resolve(),pending=0,generation=0;
 return {get generation(){return generation;},get busy(){return pending>0;},run(task){pending++;generation++;onChange(true,generation);const job=chain.catch(()=>{}).then(task);chain=job.finally(()=>{pending--;onChange(pending>0,generation);});chain.catch(()=>{});return job;}};
}
