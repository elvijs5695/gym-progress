/**
 * PWA notifications must be sent by the active service worker registration.
 * The Notification constructor is illegal in some PWA/browser contexts.
 * Notification delivery is optional: a denied permission, unavailable worker or
 * browser implementation failure must never block login or workout flows.
 */
export async function deliverPwaNotification(title, options = {}, context = {}) {
  try {
    // Native OS adapter: same message, permission and tag semantics as PWA.
    // The Android host must return false when OS permission is unavailable.
    const native = context.androidBridge ?? globalThis.GymProgressAndroid;
    if (native && typeof native.showNotification === 'function')
      return native.showNotification(String(title), String(options.body??''), String(options.tag??'')) === true;
    const notificationApi = context.notificationApi ?? globalThis.Notification;
    const serviceWorker = context.serviceWorker ?? globalThis.navigator?.serviceWorker;
    if (!notificationApi || notificationApi.permission !== 'granted') return false;
    if (!serviceWorker || typeof serviceWorker.getRegistration !== 'function') return false;
    // getRegistration() is bounded by the browser's registration lookup, unlike
    // serviceWorker.ready which may never settle if no worker becomes active.
    const registration = await serviceWorker.getRegistration();
    if (!registration?.active || typeof registration.showNotification !== 'function') return false;
    await registration.showNotification(String(title), options);
    return true;
  } catch {
    // Notifications are best effort; never propagate into account bootstrap.
    return false;
  }
}
