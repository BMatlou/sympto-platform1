# Sympto web push notifications

The current web app uses the standard Web Push API with VAPID. No paid push provider is required.

## Generate VAPID keys

From `api/`:

```bash
npm run push:vapid
```

Set the generated values in the API environment:

```env
PUSH_VAPID_PRIVATE_KEY_BASE64=<generated private key>
PUSH_VAPID_SUBJECT=mailto:<address you control>
```

The public key is derived from the private key by the API and is never stored in the frontend environment.

## How it works

1. The user opens Notification preferences and enables Push for a notification type.
2. The browser asks for notification permission from that user action.
3. Sympto creates a Web Push subscription and stores it in `DeviceToken` as `WEB_PUSH`.
4. The notification queue processor sends due `PUSH` notifications using VAPID and encrypted `aes128gcm` payloads.
5. `web/public/sympto-sw.js` displays the notification even when the Sympto page is not in the foreground.
6. Selecting the notification opens the relevant Sympto route.

## Requirements

Push subscriptions require a secure browser context. HTTPS is required in deployed environments; localhost is treated as a secure context by supported browsers.

Push is currently supported in the web application. Native Android/iOS push through FCM/APNs remains a separate adapter for a packaged mobile client.
