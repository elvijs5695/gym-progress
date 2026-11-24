/**
 * Gym Progress Android native capability transport.
 * Only the AndroidX origin-checked main-frame WebMessageListener may supply
 * GymProgressNativeChannel. Browsers get no privileged native object.
 * Requests use a strict command allowlist in MainActivity; there is no
 * addJavascriptInterface bridge and no arbitrary native execution.
 */
(() => {
  'use strict';
  const transport = globalThis.GymProgressNativeChannel;
  if (!transport || typeof transport.postMessage !== 'function') return;

  const awaiting = new Map();
  let nextId = 1;
  let permissions = {notification: 'default', alarm: 'exact-alarm-required'};
  let alarmStatus = 'pending';
  const validMethods = new Set([
    'capabilities', 'saveTextDocument', 'syncWorkoutAlarms', 'syncWorkoutStatus',
    'syncReminders', 'playCue', 'requestExactAlarmAccess', 'requestNotifications',
    'showNotification', 'setKeepScreenAwake'
  ]);
  const notifyPermissions = () => {
    try { globalThis.gp?.nativeNotificationPermissionResult?.('resume'); } catch {}
  };
  const messageFromNative = event => {
    let response;
    try { response = JSON.parse(String(event.data)); } catch { return; }
    if (!response || typeof response !== 'object' || !Object.hasOwn(response, 'id')) return;
    const key = String(response.id), task = awaiting.get(key);
    if (!task) return;
    awaiting.delete(key);
    clearTimeout(task.timeout);
    if (response.ok === true) task.resolve(response.value);
    else task.reject(new Error('Native capability unavailable'));
  };
  transport.onmessage = messageFromNative;
  function command(method, args = {}, timeoutMs = 8000) {
    if (!validMethods.has(method)) return Promise.reject(new Error('Unsupported native capability'));
    const id = String(nextId++);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        awaiting.delete(id);
        reject(new Error('Native capability did not answer'));
      }, timeoutMs);
      awaiting.set(id, {resolve, reject, timeout});
      try { transport.postMessage(JSON.stringify({id, method, args})); }
      catch (error) { clearTimeout(timeout); awaiting.delete(id); reject(error); }
    });
  }
  function background(method, args = {}) { void command(method, args).catch(() => {}); }
  function refreshCapabilities() {
    return command('capabilities').then(value => {
      if (value && typeof value === 'object') {
        permissions = {
          notification: ['granted', 'denied', 'default'].includes(value.notification) ? value.notification : 'default',
          alarm: value.alarm === 'ready' ? 'ready' : 'exact-alarm-required'
        };
        notifyPermissions();
      }
      return permissions;
    });
  }
  const adapter = Object.freeze({
    saveTextDocument(name, mime, content) { return command('saveTextDocument', {name, mime, content}, 20000); },
    syncWorkoutAlarms(plan) {
      // Android always owns the countdown once a native plan is submitted;
      // the JavaScript timer must not play a second copy of the same cue.
      command('syncWorkoutAlarms', {plan}).then(status => {
        alarmStatus = String(status || 'unavailable');
        try { globalThis.gp?.nativeWorkoutAlarmStatusResult?.(alarmStatus); } catch {}
      }).catch(() => { alarmStatus = 'bridge-error'; });
      return alarmStatus === 'bridge-error' ? 'bridge-error' : 'scheduled';
    },
    syncWorkoutStatus(plan) { background('syncWorkoutStatus', {plan}); return 'queued'; },
    syncReminders(plan) { background('syncReminders', {plan}); return 'queued'; },
    playCue(kind) { background('playCue', {kind}); },
    alarmAccessStatus() { return permissions.alarm; },
    requestExactAlarmAccess() { background('requestExactAlarmAccess'); },
    notificationPermission() { return permissions.notification; },
    requestNotifications() { background('requestNotifications'); },
    showNotification(title, body, tag) { return command('showNotification', {title, body, tag}).then(Boolean).catch(() => false); },
    setKeepScreenAwake(enabled) { background('setKeepScreenAwake', {enabled: !!enabled}); },
    refreshCapabilities
  });
  Object.defineProperty(globalThis, 'GymProgressAndroid', {value: adapter, writable: false, configurable: false});
  void refreshCapabilities().catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void refreshCapabilities().catch(() => {});
  });
})();
