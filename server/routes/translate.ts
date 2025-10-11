import express from 'express';

const router = express.Router();

// Proxy to LibreTranslate-like API to avoid CORS in browsers
// Env: LIBRE_TRANSLATE_URL (e.g., https://libretranslate.de/translate)
router.post('/', async (req, res) => {
  try {
    const { q, source = 'auto', target = 'en', format = 'text' } = req.body || {};
    if (!q || !target) return res.status(400).json({ error: 'q and target required' });
    const endpoint = process.env.LIBRE_TRANSLATE_URL || 'https://libretranslate.de/translate';
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, source, target, format })
    });
    if (!r.ok) return res.status(r.status).json({ error: 'Upstream translate failed' });
    const data = await r.json();
    const text = (data && (data.translatedText || data.translation)) || '';
    return res.json({ translatedText: text });
  } catch (e:any) {
    return res.status(500).json({ error: 'Translate proxy error', detail: e?.message });
  }
});

export default router;
