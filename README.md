# MYChat PWA + Web Push

## Run locally
1. Install Node.js 20+.
2. In this folder run: `npm install`
3. Run: `npm start`
4. Open `http://localhost:3000/forme.html`
5. Join the room and press **Enable message notifications**.
6. Install with **INSTALL APP** when the browser makes the install prompt available.

For a real phone, deploy this folder to an HTTPS server. If the HTML and push server are on different origins, set `PUSH_SERVER_URL` in `forme.html` and enable CORS on the server.

## Production VAPID keys
On first start, `server.js` prints a VAPID public/private key pair. Save them as environment variables:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (for example `mailto:you@example.com`)

Do not expose the private key in browser code.

## Important sound limitation
Standard Web Push/PWA notifications cannot force a custom audio file to play while the app is closed or the screen is off. The service worker sets `silent:false` and vibration, so the browser/OS may play its normal notification sound according to the user's notification channel, Do Not Disturb, silent mode, and system volume. A WhatsApp-style custom background sound requires native-app/platform notification-channel capabilities and is not guaranteed by the Web Push API.
