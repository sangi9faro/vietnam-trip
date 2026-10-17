// Reset the local Firebase emulators and load a repeatable test dataset.
// Usage (emulators running via `firebase emulators:start`):  node scripts/seed-emulator.mjs
// Only ever talks to 127.0.0.1 — never to the live project. Member names are placeholders (成员A–D).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'vietnam-trip-10761';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const ADMIN = { Authorization: 'Bearer owner', 'content-type': 'application/json' };   // emulator-only admin token (skips rules)

// JS value → Firestore REST value
function v(x) {
  if (x === null || x === undefined) return { nullValue: null };
  if (typeof x === 'boolean') return { booleanValue: x };
  if (typeof x === 'number') return Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x };
  if (typeof x === 'string') return { stringValue: x };
  if (Array.isArray(x)) return { arrayValue: { values: x.map(v) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, v(y)])) } };
}
async function put(path, data) {
  const r = await fetch(`${FS}/${path}`, { method: 'PATCH', headers: ADMIN, body: JSON.stringify({ fields: v(data).mapValue.fields }) });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
}

// 1. wipe both emulators
for (const [url, what] of [[`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, 'Firestore'],
                           [`http://127.0.0.1:9199/emulator/v1/projects/${PROJECT}/accounts`, 'Auth']]) {
  const r = await fetch(url, { method: 'DELETE' });
  if (!r.ok) throw new Error(`${what} emulator not reachable (${r.status}) — run: firebase emulators:start`);
}

// 2. seed
const now = Date.now(), day = 864e5, at = d => now - d * day;   // `at` some days ago
const IDS = ['m1', 'm2', 'm3', 'm4'], by = id => 'seed-' + id;   // seed entries belong to fake devices, not to test browsers
await put('meta/settings', { members: { m1: '成员A', m2: '成员B', m3: '成员C', m4: '成员D' }, rates: { VND: 3650, KRW: 195, USD: 0.14 }, ratesAt: at(1), at: at(1) });

// itinerary: the fallback copy embedded in guide.html
const src = readFileSync(join(ROOT, 'guide.html'), 'utf8'), i = src.indexOf('const DAYS = ['), j = src.indexOf('\n];', i);
const days = new Function(`const SGN=[10.81798,106.65626],D1=[10.77372,106.70405],HCMC_HOTEL=[10.78246,106.69186],g=q=>encodeURIComponent(q);${src.slice(i, j + 3)};return DAYS;`)().filter(d => d.id);
let n = 0;
for (const d of days) {
  const locations = d.locations.map((l, k) => Object.fromEntries(Object.entries({ id: l.id || `s${d.id}${k}`, name: l.name, lat: l.lat, lng: l.lng, type: l.type, time: l.time, desc: l.desc, gmap: l.gmap })
    .filter(([, x]) => x !== undefined && x !== '')));
  // same shape as the live docs (the days rule requires color / who / by)
  await put(`days/d${d.id}`, { label: d.label, date: d.date, title: d.title, color: d.color || '#0B7A8C', locations, rev: 1, who: '', by: 'seed', at: at(2) }); n++;
}

// expenses: every split mode, settled, locked and unlocked (old-style) entries, several currencies and days
const E = [
  ['凯悦房费', 950, 'CNY', 'm1', IDS, { cat: 'stay', day: '2026-12-31' }],
  ['Grab 去市区', 120000, 'VND', 'm2', IDS, { cat: 'transport', day: '2026-12-30' }],
  ['河粉午饭', 380000, 'VND', 'm3', IDS, { cat: 'food', day: '2026-12-30' }],
  ['Chill Skybar', 1500000, 'VND', 'm1', ['m1', 'm2', 'm3'], { cat: 'food', day: '2026-12-30' }],
  ['卧铺大巴', 1200000, 'VND', 'm4', IDS, { cat: 'transport', day: '2026-12-31' }],
  ['跳岛游', 2000000, 'VND', 'm2', IDS, { cat: 'fun', day: '2027-01-01' }],
  ['Fusion 房费', 6000, 'CNY', 'm1', IDS, { cat: 'stay', mode: 'shares', shares: { m1: 1.5, m2: 1.5, m3: 1, m4: 1 }, day: '2027-01-01' }],
  ['海鲜大餐', 2400000, 'VND', 'm3', IDS, { cat: 'food', mode: 'amounts', shares: { m1: 700000, m2: 600000, m3: 600000, m4: 500000 }, day: '2027-01-02' }],
  ['夜市各付各的', 800000, 'VND', 'm4', IDS, { cat: 'food', settled: true, day: '2026-12-31' }],
  ['金兰 → 胡志明机票', 4800000, 'VND', 'm1', IDS, { cat: 'transport', day: '2027-01-03' }],
  ['手信', 50, 'USD', 'm2', ['m2', 'm4'], { cat: 'shop', day: '2027-01-02' }],
  ['eSIM', 400, 'CNY', 'm3', IDS, { cat: 'other' }],                                    // 行前, no day
  ['旧账：机场接送', 250000, 'VND', 'm2', IDS, { old: true }],                               // old entry: no mode / cny / rate / cat
];
for (const [k, [title, amount, currency, payer, split, o]] of E.entries()) {
  const r = currency === 'CNY' ? 1 : { VND: 3650, KRW: 195, USD: 0.14 }[currency], doc = { title, amount, currency, payer, split, at: at(12 - k), by: by(payer) };
  if (!o.old) Object.assign(doc, { mode: o.mode || 'equal', cny: amount / r, rate: r, cat: o.cat }, o.shares ? { shares: o.shares } : {}, o.day ? { day: o.day } : {}, o.settled ? { settled: true } : {});
  await put(`expenses/seed-e${k + 1}`, doc);
}
const S = [['m3', 'm1', 200, 'wechat'], ['m4', 'm1', 300, 'alipay'], ['m2', 'm3', 150000, 'cash', 'VND']];
for (const [k, [from, to, amount, method, cur = 'CNY']] of S.entries())
  await put(`settlements/seed-s${k + 1}`, { from, to, amount, currency: cur, cny: cur === 'CNY' ? amount : amount / 3650, method, note: '', at: at(1), by: by(from) });

// checklist (toolbox 准备清单) and group tasks
const PERSONAL = ['passport', 'visa', 'ticket', 'esim', 'grab', 'cash', 'insurance'];
for (const [k, id] of IDS.entries()) await put(`checklist/${id}`, { items: Object.fromEntries(PERSONAL.slice(0, 2 + k).map(p => [p, true])), at: at(1) });
await put('checklist/group', { items: { bus1231: { done: true, owner: 'm2' }, island: { done: false, owner: 'm1' }, hcmc: { done: false, owner: '' } }, at: at(1) });

// packing: different progress per person, one custom item, one checkout tick
const PK = ['passport', 'evisa', 'itinerary', 'hotelconf', 'vnd', 'card', 'phone', 'cable', 'powerbank', 'adapter', 'tees', 'swim', 'toothbrush', 'sunscreen', 'stomach', 'seasick'];
for (const [k, id] of IDS.entries())
  await put(`packing/${id}`, { items: Object.fromEntries(PK.slice(0, 4 + k * 4).map((p, x) => [p, x === 1 && k === 2 ? 'skip' : 'done'])),
    custom: k === 0 ? [{ k: 'c_seed', label: '隐形眼镜', cat: 'toilet' }] : [], checkout: { hyatt: k === 0 ? { passport: true } : {}, fusion: {} }, at: at(1) });

// a few 攻略收藏
const L = [['越南电子签证指南', 'https://evisa.gov.vn/', '签证', 'm1'], ['芽庄跳岛游攻略', 'https://example.com/nhatrang-island', '玩乐', 'm2'], ['胡志明河粉合集', 'https://example.com/pho', '吃喝', 'm3']];
for (const [k, [title, url, tag, who]] of L.entries()) await put(`links/seed-l${k + 1}`, { title, url, tag, who, by: by(who), at: at(3 - k) });

// the first survey page (vote.html v1) and the poll collection — what the migration has to carry over
for (const [k, id] of IDS.entries()) {
  await put(`people/${by(id)}`, { name: ['成员A', '成员B', '成员C', '成员D'][k], at: at(30) });
  await put(`votes/${by(id)}`, { dest: ['nt', 'pq', 'nt', 'dn'][k], at: at(30) });
  await put(`quiz/${by(id)}`, { answers: [0, 1, 2], at: at(30) });
}
await put('notes/seed-n1', { text: '跨年要看烟花', author: by('m2'), at: at(29) });
await put('polls/seed-p1', { title: '12/30 晚上去哪', options: ['裴援街', 'Chill Skybar'], multi: false, closed: false, who: 'm1', by: by('m1'), at: at(5) });
await put('polls/seed-p1/ballots/m1', { choices: [1], by: by('m1'), at: at(5) });
await put('polls/seed-p1/ballots/m3', { choices: [0], by: by('m3'), at: at(4) });

// the trip owner, for testing owner-only pages (admin/migrate.html) on the emulator: email/password login, emulator only
const OWNER = 'X8BxRGYdemf6Wwb9MtQcLAxpy5q2';
const ar = await fetch(`http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, { method: 'POST', headers: ADMIN,
  body: JSON.stringify({ localId: OWNER, email: 'owner@example.com', password: 'emulator-only', displayName: 'Owner (emulator)' }) });
if (!ar.ok) throw new Error('owner account: ' + await ar.text());

console.log(`emulator seeded: ${n} days, ${E.length} expenses, ${S.length} repayments, checklist + packing for 4 members, ${L.length} links, survey + 1 poll, owner login owner@example.com`);
