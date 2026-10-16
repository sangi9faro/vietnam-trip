// Precompute road routes for every taxi / bus leg of the itinerary into routes.json.
// Usage (from the repo root):  node scripts/build-routes.mjs
// Reads days/d1–d6 from Firestore (anonymous sign-in, same as the site); falls back to the
// copy of DAYS embedded in guide.html when Firestore can't be reached.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = createRequire(import.meta.url)(join(ROOT, 'routes.js'));
const OUT = join(ROOT, 'routes.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function plain(v) {
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, plain(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(plain);
  if ('integerValue' in v) return +v.integerValue;
  if ('doubleValue' in v) return v.doubleValue;
  return Object.values(v)[0];
}
async function fromFirestore() {
  const cfg = readFileSync(join(ROOT, 'firebase-config.js'), 'utf8');
  const apiKey = /apiKey:\s*"([^"]+)"/.exec(cfg)[1], project = /projectId:\s*"([^"]+)"/.exec(cfg)[1];
  const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, { method: 'POST', body: '{"returnSecureToken":true}', headers: { 'content-type': 'application/json' } })).json();
  if (!auth.idToken) throw new Error('anonymous sign-in failed');
  const r = await (await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/days?pageSize=20`, { headers: { Authorization: 'Bearer ' + auth.idToken } })).json();
  if (!r.documents) throw new Error('no days: ' + JSON.stringify(r).slice(0, 200));
  return r.documents.map(d => ({ id: +d.name.split('/').pop().slice(1), ...Object.fromEntries(Object.entries(d.fields).map(([k, x]) => [k, plain(x)])) }))
    .sort((a, b) => a.id - b.id);
}
function fromGuide() {
  const src = readFileSync(join(ROOT, 'guide.html'), 'utf8'), i = src.indexOf('const DAYS = ['), j = src.indexOf('\n];', i);
  return new Function(`${src.slice(i, j + 3)}; return DAYS;`)().filter(d => d.id);
}

let days;
try { days = await fromFirestore(); console.log(`read ${days.length} days from Firestore`); }
catch (e) { console.warn('Firestore unavailable (' + e.message + '), using guide.html fallback'); days = fromGuide(); }

const legs = new Map();
for (const d of days) {
  const main = (d.locations || []).filter(l => l.time !== '—' && l.lat);
  for (let i = 1; i < main.length; i++) {
    const a = main[i - 1], b = main[i], via = R.classify(a, b);
    if (via === 'taxi' || via === 'bus') legs.set(R.key(a, b), { a, b, via, day: d.id });
  }
}
const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const out = {}, today = new Date().toISOString().slice(0, 10);
let n = 0;
for (const [k, { a, b, via, day }] of legs) {
  if (n++) await sleep(1000);   // be gentle with the public demo server
  try {
    const r = await R.fetchRoute(a, b, { timeout: 15000 });
    out[k] = { ...r, at: today };
    console.log(`D${day} ${via.padEnd(4)} ${String(r.km).padStart(6)} km ${String(r.min).padStart(4)} min ${r.coords.length} pts  ${a.name} → ${b.name}`);
  } catch (e) {
    if (old[k]) { out[k] = old[k]; console.warn(`D${day} kept old route (${e.message}): ${a.name} → ${b.name}`); }
    else console.warn(`D${day} FAILED (${e.message}): ${a.name} → ${b.name}`);
  }
}
writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log(`wrote ${Object.keys(out).length} routes to routes.json (${(JSON.stringify(out).length / 1024).toFixed(1)} KB)`);
