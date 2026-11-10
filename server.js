import express from 'express';
import { fileURLToPath } from 'node:url';
import { analyze, createGeminiGenerator, prepare, readEstimate } from './lib/analyze.js';

const MAX_B64 = 6_000_000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;

const isImage = (s) => typeof s === 'string' && s.length > 100 && s.length < MAX_B64 && /^\/9j\//.test(s);
const shortText = (s, max) => typeof s === 'string' && s.length <= max;
const textList = (a) => Array.isArray(a) && a.length <= 12 && a.every((s) => shortText(s, 80));
const validLevels = (l) => l && typeof l === 'object' && !Array.isArray(l) && Object.entries(l).every(([k, v]) => ['pain', 'swell', 'bruise'].includes(k) && Number.isInteger(v) && v >= 1 && v <= 5);

export function createApp(generate = createGeminiGenerator(), { dailyMax = Number(process.env.DAILY_MAX) || 300 } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.set({
      'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' blob: data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    });
    next();
  });
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
  app.use(express.json({ limit: '14mb' }));

  const hits = new Map();
  let day = '';
  let used = 0;
  const guard = (req, res, next) => {
    if (!generate) return res.status(503).json({ error: 'AIの接続が設定されていません。' });
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(req.ip, recent);
    if (recent.length > MAX_PER_WINDOW) return res.status(429).json({ error: '回数の上限に達しました。10分ほど待ってから試してください。' });
    const today = new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10);
    if (today !== day) { day = today; used = 0; hits.clear(); }
    if (++used > dailyMax) return res.status(429).json({ error: '本日の利用上限に達しました。明日もう一度試してください。' });
    next();
  };

  app.get('/api/health', (_req, res) => res.json({ ok: true, ai: Boolean(generate) }));

  app.post('/api/analyze', guard, async (req, res) => {
    const { procedures = [], postOpDay, intervalDays, levels = {}, note = '', redFlags = [], yesterday, today, consent } = req.body ?? {};
    if (consent !== true) return res.status(400).json({ error: '送信への同意にチェックを入れてください。' });
    const validGap = intervalDays === undefined || (Number.isInteger(intervalDays) && intervalDays >= 1 && intervalDays <= 730);
    if (!validLevels(levels) || !textList(procedures) || !validGap || !Number.isInteger(postOpDay) || postOpDay < 0 || postOpDay > 730 || !textList(redFlags) || !shortText(note, 300)) {
      return res.status(400).json({ error: '入力内容を確認してください。' });
    }
    const hasPhotos = yesterday !== undefined || today !== undefined;
    if (hasPhotos && (!isImage(yesterday) || !isImage(today))) return res.status(400).json({ error: '写真は2枚そろえてください。' });
    if (!hasPhotos && !note && redFlags.length === 0 && Object.keys(levels).length === 0) return res.status(400).json({ error: '気になっていることを入力してください。' });
    try {
      res.json(await analyze({ procedures, postOpDay, intervalDays, levels, note, redFlags, yesterday, today }, generate));
    } catch (err) {
      console.error('analyze_failed', err?.name, err?.status);
      res.status(502).json({ error: '作成できませんでした。もう一度試してください。' });
    }
  });

  app.post('/api/estimate', guard, async (req, res) => {
    const { image, consent } = req.body ?? {};
    if (consent !== true) return res.status(400).json({ error: '送信への同意にチェックを入れてください。' });
    if (!isImage(image)) return res.status(400).json({ error: '見積書の画像を選んでください。' });
    try {
      res.json(await readEstimate({ image }, generate));
    } catch (err) {
      console.error('estimate_failed', err?.name, err?.status);
      res.status(502).json({ error: '読み取れませんでした。もう一度試してください。' });
    }
  });

  app.post('/api/prep', guard, async (req, res) => {
    const { procedure, goal, said = '', pressure = [] } = req.body ?? {};
    if (!shortText(procedure, 80) || !procedure || !shortText(goal, 300) || !goal || !shortText(said, 300) || !textList(pressure)) {
      return res.status(400).json({ error: '入力内容を確認してください。' });
    }
    try {
      res.json(await prepare({ procedure, goal, said, pressure }, generate));
    } catch (err) {
      console.error('prep_failed', err?.name, err?.status);
      res.status(502).json({ error: '作成できませんでした。もう一度試してください。' });
    }
  });

  app.use((err, _req, res, next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: '写真のサイズが大きすぎます。' });
    next(err);
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 8080;
  createApp().listen(port, () => console.log(`listening on ${port}`));
}
