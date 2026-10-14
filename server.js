const express = require('express');
const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/', (req, res) => {
    res.redirect('/forme.html');
});
const DATA_FILE = path.join(__dirname, 'push-subscriptions.json');
const PORT = process.env.PORT || 3000;

function loadSubscriptions() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return []; }
}
function saveSubscriptions(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

let publicKey = process.env.VAPID_PUBLIC_KEY;
let privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  console.log('\nGenerated temporary VAPID keys.');
  console.log('For production, set these environment variables so subscriptions survive restarts:');
  console.log('VAPID_PUBLIC_KEY=' + publicKey);
  console.log('VAPID_PRIVATE_KEY=' + privateKey + '\n');
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  publicKey,
  privateKey
);

// Serve the PWA and push API from one origin.
app.use(express.static(__dirname));

app.get('/api/push/vapid-public-key', (_req, res) => {
  res.json({ publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription, room, username } = req.body || {};
  if (!subscription?.endpoint || !room) return res.status(400).json({ error: 'subscription and room are required' });

  const items = loadSubscriptions();
  const index = items.findIndex(x => x.subscription?.endpoint === subscription.endpoint);
  const record = { subscription, room: String(room), username: String(username || ''), updatedAt: Date.now() };
  if (index >= 0) items[index] = record;
  else items.push(record);
  saveSubscriptions(items);
  res.status(201).json({ ok: true });
});

app.post('/api/push/notify', async (req, res) => {
  const { room, sender, text, messageId, type } = req.body || {};
  if (!room || !sender) return res.status(400).json({ error: 'room and sender are required' });

  let items = loadSubscriptions();
  const targets = items.filter(x => x.room === String(room) && x.username !== String(sender));
  const payload = JSON.stringify({
    title: sender,
    sender,
    text: text || (type === 'audio' ? 'Voice message' : 'New message'),
    room: String(room),
    messageId: messageId || '',
    url: './forme.html'
  });

  const dead = new Set();
  const results = await Promise.allSettled(targets.map(async item => {
    try {
      await webpush.sendNotification(item.subscription, payload, { TTL: 60 * 60 });
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) dead.add(item.subscription.endpoint);
      throw err;
    }
  }));

  if (dead.size) {
    items = items.filter(x => !dead.has(x.subscription?.endpoint));
    saveSubscriptions(items);
  }

  res.json({
    ok: true,
    targeted: targets.length,
    delivered: results.filter(r => r.status === 'fulfilled').length
  });
});

app.listen(PORT, () => {
  console.log(`MYChat PWA + push server running on http://localhost:${PORT}`);
});
