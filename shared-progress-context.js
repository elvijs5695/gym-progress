/** Shared cards must keep the same comparison context as the corresponding Log.
 * Null = no comparable percentage / legacy unknown; never infer 'unchanged'. */
export function sharedProgressStructureChanged(metrics) {
  if(metrics?.progressPercent==null || !Number.isFinite(Number(metrics.progressPercent)))return null;
  return metrics.volumeComparison?.structureChanged === true;
}
export function showSharedProgressCaveat(event) {
  return event?.progress_percent!=null && Number.isFinite(Number(event.progress_percent)) &&
    event.progress_structure_changed === true;
}
