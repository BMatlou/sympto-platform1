import { patientNotificationsService } from "@/services/patient-notifications.service";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

function supported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration() {
  if (!supported()) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  return navigator.serviceWorker.register("/sympto-sw.js", {
    scope: "/",
  });
}

export async function enablePushNotifications() {
  if (!supported()) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  const permission = await window.Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Browser notifications are blocked. Allow notifications for Sympto in your browser settings and try again."
        : "Notification permission was not granted.",
    );
  }

  const registration = await getRegistration();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey = await patientNotificationsService.getPushPublicKey();

    if (!publicKey) {
      throw new Error("Sympto push notifications are not configured yet.");
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await patientNotificationsService.registerPushSubscription(subscription);

  return subscription;
}

export async function syncExistingPushSubscription() {
  if (!supported() || window.Notification.permission !== "granted") {
    return false;
  }

  try {
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return false;

    await patientNotificationsService.registerPushSubscription(subscription);
    return true;
  } catch {
    return false;
  }
}

export async function getExistingPushSubscription() {
  if (!supported() || window.Notification.permission !== "granted") {
    return null;
  }

  try {
    const registration = await getRegistration();
    return registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}
