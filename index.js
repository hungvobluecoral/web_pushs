import 'dotenv/config';
import cors from 'cors';
import webPush from 'web-push';
import express from 'express';
import bodyParser from 'body-parser';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';
const API_PORT = process.env.PORT || 3000;

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('❌ Missing VAPID keys. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env');
  process.exit(1);
}

webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

app.post('/send-notification', async (req, res) => {
  const { title, body, sub } = req.body;

  if (!sub || !sub.endpoint) {
    return res.status(400).json({ success: false, message: 'Invalid subscription' });
  }

  const payload = JSON.stringify({ title, body });

  try {
    await webPush.sendNotification(sub, payload);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('❌ Push failed:', error.message);
    res.status(500).json({ success: false, message: 'Push failed', error: error.message });
  }
});

app.listen(API_PORT, () => {
  console.log(`🌐 Express API listening on port ${API_PORT}`);
});
