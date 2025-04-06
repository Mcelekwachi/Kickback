const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const OpenAI = require('openai');
const admin = require('firebase-admin');

dotenv.config();

// ✅ Firebase Admin Setup
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// ✅ Express App Setup
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ✅ OpenAI Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ AI Product Generator Route
app.post('/generate', async (req, res) => {
  let { handle, bio } = req.body;

  handle = handle.trim();
  bio = bio?.trim() || 'This creator shares helpful and engaging content online.';

  const fakeContent = `
    "${handle} just hit a new PR at the gym!"
    "${handle} shares a full ab workout – 10 mins no equipment."
    "${handle} posts meal prep and high protein recipes!"
  `;

  const prompt = `
You are a digital product strategist helping online creators.

This creator’s bio: "${bio}"

Their recent content includes:
${fakeContent}

Suggest 3 simple digital micro-products they could sell to their audience.

Format as JSON:
[
  { "title": "...", "description": "..." },
  ...
]
  `;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    const ideas = completion.choices[0]?.message?.content || '[]';
    const parsed = JSON.parse(ideas);

    // ✅ Save generated ideas temporarily under @handle (not final save)
    await db.collection('storefronts').doc(`@${handle}`).set({
      products: parsed,
      updatedAt: new Date().toISOString()
    });

    res.send(ideas);
  } catch (error) {
    console.error('🛑 OpenAI Error:', error.message);
    res.status(500).json({
      error: 'AI generation failed. Please try again later.',
      details: error.message,
    });
  }
});

// ✅ Creator Storefront Route - Load saved products
app.get('/store/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    const doc = await db.collection('storefronts').doc(uid).get();

    if (!doc.exists) {
      return res.status(404).send({ error: 'Creator not found' });
    }

    const data = doc.data();
    res.send(data.products);
  } catch (error) {
    console.error('🛑 Firebase Fetch Error:', error.message);
    res.status(500).send({ error: 'Failed to load products' });
  }
});

// ✅ Save Edited Products Route (saving with UID)
app.post('/save', async (req, res) => {
  const { uid, products } = req.body;

  if (!uid) {
    return res.status(400).json({ error: 'Missing user ID.' });
  }

  try {
    await db.collection('storefronts').doc(uid).set({
      products,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    res.send({ success: true });
  } catch (error) {
    console.error('🛑 Save Error:', error.message);
    res.status(500).json({ error: 'Failed to save products' });
  }
});

// ✅ AI Bio Generator
app.post('/autobio', async (req, res) => {
  const { prompt } = req.body;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
    });

    const text = completion.choices[0]?.message?.content || '';
    res.send({ text });
  } catch (error) {
    console.error('🛑 AutoBio Error:', error.message);
    res.status(500).send({ error: 'Auto bio generation failed.' });
  }
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
