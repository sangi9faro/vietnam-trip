// Multi-trip rules (trips/{tripId}/…). Run with:  npm run test:rules
import { readFileSync } from 'node:fs';
import { test, before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where } from 'firebase/firestore';

const OWNER = 'X8BxRGYdemf6Wwb9MtQcLAxpy5q2', T = 'trips/test-trip', CODE = 'Join2026abc';
let env;
before(async () => { env = await initializeTestEnvironment({ projectId: 'vietnam-trip-10761', firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') } }); });
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    await setDoc(doc(db, T), trip());
    await setDoc(doc(db, T + '/members/phoneA'), { code: CODE, member: 'm1', at: 1 });   // m1 on phone A
    await setDoc(doc(db, T + '/members/safariA'), { code: CODE, member: 'm1', at: 1 });  // m1 again, other browser
    await setDoc(doc(db, T + '/members/phoneB'), { code: CODE, member: 'm2', at: 1 });
    await setDoc(doc(db, T + '/expenses/e1'), expense('phoneA', { byMember: 'm1' }));
    await setDoc(doc(db, T + '/expenses/old'), expense('phoneA'));                     // migrated entry, no byMember
  });
});
const trip = (extra = {}) => ({ title: '测试旅行', start: '2026-12-25', end: '2026-12-29', country: '台湾', countryCode: 'TW', route: ['台北'], places: [],
  color: '#0071e3', summary: '', coverPos: '50% 50%', members: { m1: '成员A', m2: '成员B', m3: '成员C' }, modules: { guide: true, tools: true, bills: true, packing: true, vote: false },
  currencies: ['TWD', 'CNY'], baseCurrency: 'CNY', rates: { TWD: 4.4 }, ratesAt: 1, joinCode: CODE, visibility: 'members', owner: OWNER, at: 1, updatedAt: 1, ...extra });
const expense = (by, extra = {}) => ({ title: '晚饭', amount: 880, currency: 'TWD', payer: 'm1', split: ['m1', 'm2'], at: 1, by, mode: 'equal', cny: 200, rate: 4.4, cat: 'food', ...extra });
const as = uid => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

/* ---------- joining ---------- */
test('join with the right invite code, then pick 我是谁', async () => {
  const db = as('newPhone');
  await assertSucceeds(setDoc(doc(db, T + '/members/newPhone'), { code: CODE, member: null, at: 1 }));
  await assertSucceeds(updateDoc(doc(db, T + '/members/newPhone'), { member: 'm3' }));
  await assertSucceeds(getDoc(doc(db, T)));
});
test('wrong or missing invite code → permission-denied', async () => {
  await assertFails(setDoc(doc(as('x'), T + '/members/x'), { code: 'wrong', member: null, at: 1 }));
  await assertFails(setDoc(doc(as('x'), T + '/members/x'), { member: null, at: 1 }));
  await assertFails(setDoc(doc(as('x'), T + '/members/someoneElse'), { code: CODE, member: null, at: 1 }));   // only your own device
  await assertFails(setDoc(doc(as('x'), T + '/members/x'), { code: CODE, member: 'm9', at: 1 }));            // not a member of this trip
});
test('cannot change the stored code after joining', async () => {
  await assertFails(updateDoc(doc(as('phoneB'), T + '/members/phoneB'), { code: 'other' }));
});

/* ---------- reading ---------- */
test('members-only trip: outsiders and signed-out visitors see nothing', async () => {
  await assertFails(getDoc(doc(as('stranger'), T)));
  await assertFails(getDoc(doc(as('stranger'), T + '/expenses/e1')));
  await assertFails(getDoc(doc(anon(), T)));
  await assertSucceeds(getDoc(doc(as('phoneB'), T + '/expenses/e1')));
});
test('link trip: anyone reads, nobody outside writes', async () => {
  await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), T), { visibility: 'link' }));
  await assertSucceeds(getDoc(doc(anon(), T)));
  await assertSucceeds(getDoc(doc(as('stranger'), T + '/expenses/e1')));
  await assertFails(setDoc(doc(as('stranger'), T + '/expenses/e2'), expense('stranger')));
  await assertSucceeds(getDocs(query(collection(anon(), 'trips'), where('visibility', '==', 'link'))));
  await assertFails(getDocs(collection(anon(), 'trips')));   // a list without the filter is refused
});

/* ---------- writing as a member ---------- */
test('member records an expense (with byMember of their own)', async () => {
  await assertSucceeds(setDoc(doc(as('phoneB'), T + '/expenses/e2'), expense('phoneB', { byMember: 'm2', payer: 'm2' })));
  await assertFails(setDoc(doc(as('phoneB'), T + '/expenses/e3'), expense('phoneB', { byMember: 'm1' })));   // can't sign as someone else
  await assertFails(setDoc(doc(as('phoneB'), T + '/expenses/e4'), expense('phoneB', { payer: 'm7' })));      // m7 is not in this trip
  await assertFails(setDoc(doc(as('phoneB'), T + '/expenses/e5'), expense('phoneA')));                       // by must be this device
});
test('same member on another device can edit and delete (byMember)', async () => {
  await assertSucceeds(updateDoc(doc(as('safariA'), T + '/expenses/e1'), { amount: 900, cny: 204.5 }));
  await assertSucceeds(deleteDoc(doc(as('safariA'), T + '/expenses/e1')));
});
test('another member cannot edit or delete it', async () => {
  await assertFails(updateDoc(doc(as('phoneB'), T + '/expenses/e1'), { amount: 1 }));
  await assertFails(deleteDoc(doc(as('phoneB'), T + '/expenses/e1')));
});
test('old entries without byMember: only the recording device', async () => {
  await assertFails(updateDoc(doc(as('safariA'), T + '/expenses/old'), { amount: 1 }));
  await assertSucceeds(updateDoc(doc(as('phoneA'), T + '/expenses/old'), { amount: 900 }));
});
test('members may refresh rates but not rename the trip or read the invite list as outsiders', async () => {
  await assertSucceeds(updateDoc(doc(as('phoneB'), T), { rates: { TWD: 4.5 }, ratesAt: 2, updatedAt: 2 }));
  await assertFails(updateDoc(doc(as('phoneB'), T), { title: '改名' }));
  await assertFails(updateDoc(doc(as('phoneB'), T), { joinCode: 'stolen12345' }));
  await assertFails(getDoc(doc(as('stranger'), T + '/members/phoneA')));
});
test('packing / checklist ids must be members of this trip', async () => {
  const pk = { items: {}, custom: [], checkout: {}, at: 1 };
  await assertSucceeds(setDoc(doc(as('phoneB'), T + '/packing/m3'), pk));
  await assertFails(setDoc(doc(as('phoneB'), T + '/packing/m5'), pk));
  await assertSucceeds(setDoc(doc(as('phoneB'), T + '/checklist/group'), { items: {}, at: 1 }));
});

/* ---------- owner ---------- */
test('owner creates and edits the trip; others cannot', async () => {
  await assertSucceeds(setDoc(doc(as(OWNER), 'trips/new-2027'), trip({ title: '新旅行' })));
  await assertFails(setDoc(doc(as('phoneA'), 'trips/new-2028'), trip({ owner: 'phoneA' })));
  await assertFails(setDoc(doc(as(OWNER), 'trips/new-2029'), trip({ members: { m1: 'a', m9: 'b' } })));
  await assertSucceeds(updateDoc(doc(as(OWNER), T), { title: '改名', updatedAt: 3 }));
});
test('migration: owner copies entries recorded by other devices and adds their memberships', async () => {
  await assertSucceeds(setDoc(doc(as(OWNER), T + '/expenses/legacy1'), expense('friendOldUid')));
  await assertSucceeds(setDoc(doc(as(OWNER), T + '/members/friendOldUid'), { code: CODE, member: 'm2', at: 1 }));
  await assertSucceeds(setDoc(doc(as(OWNER), T + '/votes/friendOldUid'), { dest: 'nt' }));
  await assertFails(setDoc(doc(as('phoneA'), T + '/votes/phoneA'), { dest: 'nt' }));
});
test('cover / info / templates: owner writes, members read', async () => {
  await assertSucceeds(setDoc(doc(as(OWNER), T + '/info/static'), { sos: [{ label: '报警', number: '110' }] }));
  await assertSucceeds(getDoc(doc(as('phoneB'), T + '/info/static')));
  await assertFails(setDoc(doc(as('phoneB'), T + '/info/static'), { sos: [] }));
  await assertSucceeds(setDoc(doc(as(OWNER), 'templates/beach'), { packing: [] }));
  await assertFails(setDoc(doc(as('phoneB'), 'templates/beach'), { packing: [] }));
});
test('deleting a trip: owner can remove every part, members cannot', async () => {
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), T + '/packing/m1'), { items: {}, custom: [], checkout: {}, at: 1 }));
  await assertFails(deleteDoc(doc(as('phoneA'), T + '/packing/m1')));
  await assertSucceeds(deleteDoc(doc(as(OWNER), T + '/packing/m1')));
  await assertSucceeds(deleteDoc(doc(as(OWNER), T + '/members/phoneB')));
  await assertFails(deleteDoc(doc(as('phoneA'), T)));
  await assertSucceeds(deleteDoc(doc(as(OWNER), T)));
});

test('budgets: only the owner reads and writes', async () => {
  const b = { title: '预算', limit: 9000, trips: { 'test-trip': 'm1' }, items: [{ id: 'a', label: '机票', amount: 1000, cat: 'flight', status: 'paid' }], at: 1 };
  await assertSucceeds(setDoc(doc(as(OWNER), 'budgets/b1'), b));
  await assertSucceeds(getDoc(doc(as(OWNER), 'budgets/b1')));
  await assertFails(getDoc(doc(as('phoneB'), 'budgets/b1')));
  await assertFails(setDoc(doc(as('phoneB'), 'budgets/b2'), b));
  await assertFails(getDoc(doc(anon(), 'budgets/b1')));
});
