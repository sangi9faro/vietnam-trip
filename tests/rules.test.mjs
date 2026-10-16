// Firestore rules tests. Run with:  npm run test:rules
// (starts a throw-away Firestore emulator via `firebase emulators:exec`; never touches the live project)
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';

let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'vietnam-trip-10761', firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const A = () => env.authenticatedContext('uidA').firestore();
const B = () => env.authenticatedContext('uidB').firestore();
const anon = () => env.unauthenticatedContext().firestore();
const seed = fn => env.withSecurityRulesDisabled(c => fn(c.firestore()));
const now = () => Date.now();
const expense = (by, extra = {}) => ({ title: '晚饭', amount: 200, currency: 'CNY', payer: 'm1', split: ['m1', 'm2'], at: now(), by,
  mode: 'equal', cny: 200, rate: 1, cat: 'food', ...extra });
const repay = (by, extra = {}) => ({ from: 'm3', to: 'm1', amount: 100, currency: 'CNY', cny: 100, method: 'wechat', note: '', at: now(), by, ...extra });

/* ---------- signed-out ---------- */
test('signed-out visitors cannot read trip data', async () => {
  await seed(db => setDoc(doc(db, 'expenses/e1'), expense('uidA')));
  await assertFails(getDoc(doc(anon(), 'expenses/e1')));
  await assertFails(getDoc(doc(anon(), 'days/d1')));
});

/* ---------- expenses ---------- */
test('expenses: create own, full new shape', async () => {
  await assertSucceeds(addDoc(collection(A(), 'expenses'), expense('uidA', { mode: 'shares', shares: { m1: 1.5, m2: 1 }, day: '2026-12-30', settled: true, note: 'x' })));
});
test('expenses: old shape (no mode / cny / cat) still valid', async () => {
  await assertSucceeds(addDoc(collection(A(), 'expenses'), { title: '旧账', amount: 1, currency: 'VND', payer: 'm2', split: ['m2'], at: now(), by: 'uidA' }));
});
test('expenses: denied — wrong owner, negative amount, unknown member / category / field, bad day', async () => {
  const c = collection(A(), 'expenses');
  await assertFails(addDoc(c, expense('uidB')));
  await assertFails(addDoc(c, expense('uidA', { amount: -1 })));
  await assertFails(addDoc(c, expense('uidA', { payer: 'hacker' })));
  await assertFails(addDoc(c, expense('uidA', { split: ['m1', 'm9'] })));
  await assertFails(addDoc(c, expense('uidA', { cat: 'beer' })));
  await assertFails(addDoc(c, expense('uidA', { mode: 'random' })));
  await assertFails(addDoc(c, expense('uidA', { shares: { m9: 1 } })));
  await assertFails(addDoc(c, expense('uidA', { day: '12/30' })));
  await assertFails(addDoc(c, expense('uidA', { extra: 1 })));
});
test("expenses: only the recorder can edit or delete", async () => {
  await seed(db => setDoc(doc(db, 'expenses/e1'), expense('uidA')));
  await assertFails(updateDoc(doc(B(), 'expenses/e1'), { amount: 1 }));
  await assertFails(deleteDoc(doc(B(), 'expenses/e1')));
  await assertFails(updateDoc(doc(A(), 'expenses/e1'), { by: 'uidB' }));
  await assertSucceeds(updateDoc(doc(A(), 'expenses/e1'), { amount: 300, cny: 300 }));
  await assertSucceeds(deleteDoc(doc(A(), 'expenses/e1')));
});
test('expenses: locking an old entry (adding cny + rate) is allowed for its recorder', async () => {
  await seed(db => setDoc(doc(db, 'expenses/e1'), { title: '旧账', amount: 365000, currency: 'VND', payer: 'm1', split: ['m1'], at: 1, by: 'uidA' }));
  await assertSucceeds(updateDoc(doc(A(), 'expenses/e1'), { cny: 100, rate: 3650 }));
});

/* ---------- settlements ---------- */
test('settlements: create own', async () => { await assertSucceeds(addDoc(collection(A(), 'settlements'), repay('uidA'))); });
test('settlements: denied — from == to, bad method, missing note, other owner', async () => {
  const c = collection(A(), 'settlements');
  await assertFails(addDoc(c, repay('uidA', { to: 'm3' })));
  await assertFails(addDoc(c, repay('uidA', { method: 'paypal' })));
  const { note, ...noNote } = repay('uidA'); await assertFails(addDoc(c, noNote));
  await assertFails(addDoc(c, repay('uidB')));
  await assertFails(addDoc(c, repay('uidA', { cny: 0 })));
});
test('settlements: never editable; only the recorder deletes', async () => {
  await seed(db => setDoc(doc(db, 'settlements/s1'), repay('uidA')));
  await assertFails(updateDoc(doc(A(), 'settlements/s1'), { amount: 1 }));
  await assertFails(deleteDoc(doc(B(), 'settlements/s1')));
  await assertSucceeds(deleteDoc(doc(A(), 'settlements/s1')));
});

/* ---------- packing / checklist / meta ---------- */
const pack = (extra = {}) => ({ items: { passport: 'done' }, custom: [], checkout: { hyatt: {}, fusion: {} }, at: now(), ...extra });
test('packing: members m1–m4 only, fixed shape', async () => {
  await assertSucceeds(setDoc(doc(A(), 'packing/m1'), pack()));
  await assertFails(setDoc(doc(A(), 'packing/m9'), pack()));
  await assertFails(setDoc(doc(A(), 'packing/m1'), pack({ checkout: { other: {} } })));
  await assertFails(setDoc(doc(A(), 'packing/m1'), pack({ extra: 1 })));
});
test('checklist: m1–m4 + group, items map only', async () => {
  await assertSucceeds(setDoc(doc(A(), 'checklist/group'), { items: { bus1231: { done: true, owner: 'm2' } }, at: now() }));
  await assertFails(setDoc(doc(A(), 'checklist/m9'), { items: {}, at: now() }));
  await assertFails(setDoc(doc(A(), 'checklist/m1'), { items: {}, at: 'now' }));
});
test('meta/settings: members m1–m4 and three rates only', async () => {
  const ok = { members: { m1: '成员A' }, rates: { VND: 3650, KRW: 195, USD: 0.14 }, ratesAt: 0, at: now() };
  await assertSucceeds(setDoc(doc(A(), 'meta/settings'), ok));
  await assertFails(setDoc(doc(A(), 'meta/settings'), { ...ok, members: { m9: 'x' } }));
  await assertFails(setDoc(doc(A(), 'meta/other'), ok));
});

/* ---------- links / days / polls / favorites ---------- */
test('links: http(s) only; only the saver deletes', async () => {
  const link = by => ({ title: '攻略', url: 'https://example.com', tag: '签证', who: 'm1', by, at: now() });
  await assertSucceeds(setDoc(doc(A(), 'links/l1'), link('uidA')));
  await assertFails(setDoc(doc(A(), 'links/l2'), { ...link('uidA'), url: 'javascript:alert(1)' }));
  await assertFails(deleteDoc(doc(B(), 'links/l1')));
  await assertSucceeds(deleteDoc(doc(A(), 'links/l1')));
});
test('days: rev must go up by one; color required; never deleted', async () => {
  const day = (rev, extra = {}) => ({ label: 'D1 12/29', date: '12/29', title: 'x', color: '#E8613C', locations: [], rev, who: '', by: 'uidA', at: now(), ...extra });
  await assertSucceeds(setDoc(doc(A(), 'days/d1'), day(1)));
  await assertFails(setDoc(doc(A(), 'days/d1'), day(1)));          // same rev = stale write
  await assertSucceeds(setDoc(doc(A(), 'days/d1'), day(2)));
  const { color, ...noColor } = day(3); await assertFails(setDoc(doc(A(), 'days/d1'), noColor));
  await assertFails(deleteDoc(doc(A(), 'days/d1')));
  await assertFails(setDoc(doc(A(), 'days/d7'), day(1)));
});
test('polls: ballots only while open', async () => {
  await seed(db => setDoc(doc(db, 'polls/p1'), { title: 'q', options: ['a', 'b'], multi: false, closed: false, who: 'm1', by: 'uidA', at: 1 }));
  await assertSucceeds(setDoc(doc(B(), 'polls/p1/ballots/m2'), { choices: [0], by: 'uidB', at: now() }));
  await seed(db => updateDoc(doc(db, 'polls/p1'), { closed: true }));
  await assertFails(setDoc(doc(B(), 'polls/p1/ballots/m2'), { choices: [1], by: 'uidB', at: now() }));
});
test('favorites: anonymous visitors cannot write', async () => {
  await assertFails(setDoc(doc(A(), 'favorites/f1'), { name: 'x' }));
});
