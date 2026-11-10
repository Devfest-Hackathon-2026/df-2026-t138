import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.js';
import { isClean } from '../lib/analyze.js';

const jpg = '/9j/' + 'A'.repeat(200);
const good = { comparability: 'good', comparabilityNote: '', summary: '鼻先の赤みがやや薄くなっています。', changes: [{ area: '鼻先', change: '赤みがやや薄い', trend: 'reduced' }], consultationMessage: '術後3日目です。経過としてこのまま様子を見てよいか、ご確認いただけますでしょうか。' };
const body = { procedures: ['重瞼術（埋没法）'], postOpDay: 3, levels: { swell: 4 }, note: '', redFlags: ['38度以上の発熱'], yesterday: jpg, today: jpg, consent: true };

async function call(generate, payload, path = '/api/analyze', opts) {
  const server = createApp(generate, opts).listen(0);
  const { port } = server.address();
  const send = () => fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const res = await send();
  const out = { status: res.status, json: await res.json(), headers: res.headers, send };
  out.close = () => server.close();
  if (!opts?.keep) server.close();
  return out;
}

test('写真2枚と申告をGeminiへ渡す', async () => {
  let seen;
  const r = await call(async (c) => { seen = c; return good; }, body);
  assert.equal(r.status, 200);
  assert.equal(seen[0].parts.filter((p) => p.inlineData).length, 2);
  assert.match(seen[0].parts.at(-1).text, /38度以上/);
  assert.match(seen[0].parts.at(-1).text, /腫れの自覚 4\/5/);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
});
test('同意がなければ送らない', async () => {
  let n = 0;
  const r = await call(async () => { n++; return good; }, { ...body, consent: false });
  assert.equal(r.status, 400); assert.equal(n, 0);
});
test('評価表現は一度だけ再生成する', async () => {
  let n = 0;
  const r = await call(async () => (++n === 1 ? { ...good, summary: '順調です' } : good), body);
  assert.equal(n, 2); assert.equal(r.status, 200);
});
test('再生成でも評価表現なら返さない', async () => {
  assert.equal((await call(async () => ({ ...good, summary: '問題なさそうです' }), body)).status, 502);
});
test('不正な入力を拒否する', async () => {
  assert.equal((await call(async () => good, { ...body, postOpDay: -1 })).status, 400);
  assert.equal((await call(async () => good, { ...body, today: 'abc' })).status, 400);
  assert.equal((await call(async () => good, { ...body, levels: { pain: 6 } })).status, 400);
});
test('未設定なら作り物を返さず503', async () => {
  assert.equal((await call(null, body)).status, 503);
});
test('1日の上限で止まる', async () => {
  const r = await call(async () => good, body, '/api/analyze', { dailyMax: 1, keep: true });
  assert.equal(r.status, 200);
  assert.equal((await r.send()).status, 429);
  r.close();
});
test('写真なしでも申告があれば相談文を作る', async () => {
  const { yesterday, today, ...rest } = body;
  assert.equal((await call(async () => good, rest)).status, 200);
  assert.equal((await call(async () => good, { ...rest, note: '', redFlags: [], levels: {} })).status, 400);
});
test('写真が1枚だけなら拒否する', async () => {
  assert.equal((await call(async () => good, { ...body, today: undefined })).status, 400);
});
test('見積書を読み取り、価格の評価は止める', async () => {
  const ok = { isEstimate: true, items: [], totalYen: 1500000, doctorName: '', notFound: ['再診'], questions: ['再診料は含まれますか'] };
  assert.equal((await call(async () => ok, { image: jpg, consent: true }, '/api/estimate')).status, 200);
  assert.equal((await call(async () => ok, { image: jpg }, '/api/estimate')).status, 400);
  assert.equal((await call(async () => ({ ...ok, questions: ['この価格は高すぎます'] }), { image: jpg, consent: true }, '/api/estimate')).status, 502);
});
test('確認リストに受けない選択肢を必ず入れる', async () => {
  const r = await call(async () => ({ questions: ['総額は'], options: [{ option: '鼻フル', note: '検討中' }] }), { procedure: '鼻フルコース', goal: '鼻を高くしたい' }, '/api/prep');
  assert.deepEqual(r.json.options.map((o) => o.option).slice(0, 2), ['受けない', '今は待つ']);
});
test('医師への質問は通し、断定は止める', () => {
  assert.ok(isClean({ ...good, consultationMessage: '正常な経過でしょうか。' }));
  assert.equal(isClean({ ...good, consultationMessage: '正常な経過です。' }), false);
});

test('施術名をGeminiへ渡し、当日も受け付ける', async () => {
  let seen;
  const r = await call(async (c) => { seen = c; return good; }, { ...body, postOpDay: 0, procedures: ['脂肪吸引', '医療脱毛'] });
  assert.equal(r.status, 200);
  assert.match(seen[0].parts.at(-1).text, /脂肪吸引、医療脱毛/);
  assert.match(seen[0].parts.at(-1).text, /施術当日/);
});
test('5段階の範囲外は拒否する', async () => {
  const r = await call(async () => good, { ...body, levels: { pain: 9 } });
  assert.equal(r.status, 400);
});
test('状態チェックだけでも相談文を作れる', async () => {
  const r = await call(async () => good, { procedures: ['脂肪吸引'], postOpDay: 2, levels: { pain: 3 }, consent: true });
  assert.equal(r.status, 200);
});
