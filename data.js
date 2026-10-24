/* Common Table: shared constants and the made-up demo data.
   Loaded before app.js in the browser, and by scripts/export-seed.js in Node. */
const CATS = [
  ['food','Food'],['housing','Housing'],['health','Health'],['legal','Legal help'],
  ['jobs','Jobs & money'],['childcare','Childcare'],['transport','Transportation'],
];
const catName = k => (CATS.find(c => c[0] === k) || [k, k])[1];

/* ---------- demo data ---------- */
const ORGS = [
  { id: 'efb', name: 'Eastside Food Bank', short: 'EF', color: 'var(--s1)', email: 'intake@eastsidefood.org' },
  { id: 'hhc', name: 'Harbor Housing Coalition', short: 'HH', color: 'var(--s2)', email: 'casework@harborhousing.org' },
  { id: 'nfs', name: 'Northgate Family Services', short: 'NF', color: 'var(--s3)', email: 'staff@northgatefamily.org' },
  { id: 'rhc', name: 'Riverbend Community Clinic', short: 'RC', color: 'var(--s4)', email: 'navigator@riverbendclinic.org' },
  { id: 'lav', name: 'Legal Aid of the Valley', short: 'LA', color: 'var(--s5)', email: 'advocate@valleylegalaid.org' },
];
const STAFF = { efb: 'Dana Ruiz', hhc: 'Marcus Lee', nfs: 'Priya Natarajan', rhc: 'Tom Okafor', lav: 'Grace Whitfield' };
const org = id => ORGS.find(o => o.id === id);

const seed = () => ({
  clients: [
    { id: 'c1', first: 'Maria', last: 'Gonzalez', dob: '1984-03-12', phone: '(555) 201-4410', household: 4, language: 'Spanish', owner: 'efb',
      consent: { given: true, date: '2026-09-02', by: 'Dana Ruiz' }, sharedWith: ['hhc', 'nfs'], external: [],
      needs: ['food', 'housing', 'childcare'],
      notes: [
        { org: 'efb', author: 'Dana Ruiz', date: '2026-09-02', text: 'Weekly pantry enrollment. Family of 4, two kids under 10. Mentioned rent increase in November.' },
        { org: 'hhc', author: 'Marcus Lee', date: '2026-09-15', text: 'Screened for emergency rental assistance. Eligible. Application submitted, waiting on landlord W-9.' },
        { org: 'nfs', author: 'Priya Natarajan', date: '2026-10-08', text: 'Enrolled younger child in after-school program, sliding scale fee waived.' },
      ] },
    { id: 'c2', first: 'James', last: 'Whitaker', dob: '1961-11-30', phone: '(555) 388-0192', household: 1, language: 'English', owner: 'hhc',
      consent: { given: true, date: '2026-08-20', by: 'Marcus Lee' }, sharedWith: ['rhc'], external: ['va.caseworker@example.gov'],
      needs: ['housing', 'health'],
      notes: [
        { org: 'hhc', author: 'Marcus Lee', date: '2026-08-20', text: 'Veteran, currently in shelter. Placed on permanent supportive housing list.' },
        { org: 'rhc', author: 'Tom Okafor', date: '2026-09-03', text: 'Diabetes follow-up scheduled. Needs a fridge for insulin once housed.' },
      ] },
    { id: 'c3', first: 'Aisha', last: 'Mohammed', dob: '1993-06-18', phone: '(555) 640-7723', household: 3, language: 'Somali', owner: 'nfs',
      consent: { given: true, date: '2026-10-01', by: 'Priya Natarajan' }, sharedWith: ['efb', 'lav'], external: [],
      needs: ['food', 'legal', 'jobs'],
      notes: [
        { org: 'nfs', author: 'Priya Natarajan', date: '2026-10-01', text: 'New arrival, 2 children. Needs interpreter (Somali). Referred to food bank and legal aid for work authorization.' },
        { org: 'lav', author: 'Grace Whitfield', date: '2026-10-12', text: 'Work permit application filed. Follow-up in 90 days.' },
      ] },
    { id: 'c4', first: 'Robert', last: 'Chen', dob: '1977-01-05', phone: '(555) 912-3301', household: 2, language: 'Cantonese', owner: 'rhc',
      consent: { given: false }, sharedWith: [], external: [],
      needs: ['health', 'transport'],
      notes: [{ org: 'rhc', author: 'Tom Okafor', date: '2026-10-18', text: 'Missed two appointments because of transportation. Consent to share not yet discussed.' }] },
    { id: 'c5', first: 'Tanya', last: 'Brooks', dob: '1999-09-22', phone: '(555) 277-5609', household: 2, language: 'English', owner: 'lav',
      consent: { given: true, date: '2026-07-14', by: 'Grace Whitfield' }, sharedWith: ['hhc'], external: [],
      needs: ['legal', 'housing'],
      notes: [
        { org: 'lav', author: 'Grace Whitfield', date: '2026-07-14', text: 'Eviction notice received. Hearing set for Aug 6.' },
        { org: 'hhc', author: 'Marcus Lee', date: '2026-08-07', text: 'Eviction dismissed after back rent paid via assistance fund.' },
      ] },
    { id: 'c6', first: 'Luis', last: 'Herrera', dob: '1958-04-02', phone: '(555) 455-1180', household: 1, language: 'Spanish', owner: 'efb',
      consent: { given: true, date: '2026-10-10', by: 'Dana Ruiz' }, sharedWith: ['rhc'], external: [],
      needs: ['food', 'health'],
      notes: [{ org: 'efb', author: 'Dana Ruiz', date: '2026-10-10', text: 'Signed up for senior home delivery box. Low-sodium diet per clinic.' }] },
    { id: 'c7', first: 'Keisha', last: 'Daniels', dob: '1990-12-14', phone: '(555) 733-0047', household: 5, language: 'English', owner: 'nfs',
      consent: { given: true, date: '2026-09-25', by: 'Priya Natarajan' }, sharedWith: [], external: [],
      needs: ['childcare', 'jobs'],
      notes: [{ org: 'nfs', author: 'Priya Natarajan', date: '2026-09-25', text: 'Looking for evening childcare to start CNA training in January.' }] },
    { id: 'c8', first: 'Oleksandr', last: 'Kovalenko', dob: '1986-08-09', phone: '(555) 602-8834', household: 3, language: 'Ukrainian', owner: 'hhc',
      consent: { given: true, date: '2026-10-20', by: 'Marcus Lee' }, sharedWith: ['efb', 'nfs', 'lav'], external: [],
      needs: ['housing', 'food', 'legal'],
      notes: [{ org: 'hhc', author: 'Marcus Lee', date: '2026-10-20', text: 'Family of 3 in temporary hotel placement through Nov 15. Shared with partners for coordinated intake.' }] },
  ],
  resources: [
    { id: 'r1', org: 'efb', cat: 'food', name: 'Weekly Food Pantry', desc: 'Groceries including fresh produce, dairy and bread. Choose your own items.', address: '1420 E. Market St.', hours: 'Tue & Thu 10am–6pm, Sat 9am–1pm', days: [2,4,6], open: [9,18], phone: '(555) 210-3300', eligibility: 'Anyone in need. Bring ID if you have one; not required.', status: 'available', languages: 'English, Spanish' },
    { id: 'r2', org: 'efb', cat: 'food', name: 'Senior Home Delivery Box', desc: 'Monthly box of shelf-stable food delivered to your door.', address: 'Delivered', hours: 'Deliveries first week of month', days: [1,2,3,4,5], open: [9,17], phone: '(555) 210-3302', eligibility: 'Age 60+, income under 130% of poverty line.', status: 'limited', languages: 'English, Spanish' },
    { id: 'r3', org: 'efb', cat: 'food', name: 'Community Hot Meals', desc: 'Free hot dinner, no questions asked.', address: 'St. Brendan Hall, 88 Oak Ave.', hours: 'Mon–Fri 5pm–7pm', days: [1,2,3,4,5], open: [17,19], phone: '(555) 210-3300', eligibility: 'Everyone welcome.', status: 'available', languages: 'English' },
    { id: 'r4', org: 'hhc', cat: 'housing', name: 'Emergency Rental Assistance', desc: 'One-time help with back rent or a deposit to prevent eviction.', address: '300 Harbor Blvd, Suite 2', hours: 'Mon–Fri 9am–5pm', days: [1,2,3,4,5], open: [9,17], phone: '(555) 340-7700', eligibility: 'Household income under 80% of area median. Lease and notice required.', status: 'limited', languages: 'English, Spanish, Ukrainian' },
    { id: 'r5', org: 'hhc', cat: 'housing', name: 'Harbor Family Shelter', desc: '42 beds for families with children. Meals and case management included.', address: '19 Pier Rd.', hours: 'Intake daily 4pm–9pm', days: [0,1,2,3,4,5,6], open: [16,21], phone: '(555) 340-7711', eligibility: 'Families with at least one minor child.', status: 'full', languages: 'English' },
    { id: 'r6', org: 'hhc', cat: 'housing', name: 'Utility Bill Help', desc: 'Help paying past-due electric, gas or water bills.', address: '300 Harbor Blvd, Suite 2', hours: 'Mon–Wed 10am–3pm', days: [1,2,3], open: [10,15], phone: '(555) 340-7705', eligibility: 'Shutoff notice required.', status: 'available', languages: 'English, Spanish' },
    { id: 'r7', org: 'nfs', cat: 'childcare', name: 'After-School Program', desc: 'Homework help, snacks and activities for ages 6–13.', address: 'Northgate Community Center, 55 Elm St.', hours: 'Mon–Fri 3pm–6:30pm', days: [1,2,3,4,5], open: [15,18.5], phone: '(555) 455-2020', eligibility: 'Sliding scale fee; free under 150% of poverty line.', status: 'available', languages: 'English, Somali, Spanish' },
    { id: 'r8', org: 'nfs', cat: 'jobs', name: 'Job Readiness Workshop', desc: 'Resume help, interview practice and job leads. 4-week course.', address: '55 Elm St., Room 4', hours: 'Wed 6pm–8pm', days: [3], open: [18,20], phone: '(555) 455-2024', eligibility: 'Adults 18+.', status: 'available', languages: 'English' },
    { id: 'r9', org: 'nfs', cat: 'jobs', name: 'Free Tax Preparation', desc: 'IRS-certified volunteers file your taxes for free.', address: '55 Elm St.', hours: 'Sat 10am–2pm (Jan–Apr)', days: [6], open: [10,14], phone: '(555) 455-2030', eligibility: 'Household income under $67,000.', status: 'limited', languages: 'English, Spanish' },
    { id: 'r10', org: 'rhc', cat: 'health', name: 'Walk-in Clinic', desc: 'Primary care, vaccines and prescriptions. Pay what you can.', address: '700 Riverbend Dr.', hours: 'Mon–Sat 8am–7pm', days: [1,2,3,4,5,6], open: [8,19], phone: '(555) 600-1200', eligibility: 'Everyone, insured or not.', status: 'available', languages: 'English, Spanish, Cantonese' },
    { id: 'r11', org: 'rhc', cat: 'health', name: 'Mental Health Counseling', desc: 'Short-term counseling with licensed therapists.', address: '700 Riverbend Dr., 2nd floor', hours: 'By appointment', days: [1,2,3,4,5], open: [9,17], phone: '(555) 600-1250', eligibility: 'Ages 12+. Sliding scale.', status: 'limited', languages: 'English, Spanish' },
    { id: 'r12', org: 'rhc', cat: 'transport', name: 'Medical Ride Program', desc: 'Free rides to and from medical appointments.', address: 'Pickup at your home', hours: 'Book 48 hours ahead, Mon–Fri', days: [1,2,3,4,5], open: [8,17], phone: '(555) 600-1290', eligibility: 'Clinic patients without a car.', status: 'available', languages: 'English' },
    { id: 'r13', org: 'lav', cat: 'legal', name: 'Eviction Defense Clinic', desc: 'Free lawyer advice if you got an eviction notice or court date.', address: '12 Court Square, 3rd floor', hours: 'Mon & Thu 9am–12pm', days: [1,4], open: [9,12], phone: '(555) 777-4100', eligibility: 'Tenants facing eviction. Income limits apply.', status: 'available', languages: 'English, Spanish' },
    { id: 'r14', org: 'lav', cat: 'legal', name: 'Immigration Legal Help', desc: 'Help with work permits, green cards and asylum questions.', address: '12 Court Square, 3rd floor', hours: 'Tue 1pm–5pm', days: [2], open: [13,17], phone: '(555) 777-4120', eligibility: 'Free for low-income residents.', status: 'full', languages: 'English, Spanish, Ukrainian, Somali (interpreter)' },
  ],
  requests: [
    { id: 'q1', resource: 'r4', org: 'hhc', name: 'Sandra P.', contact: '(555) 812-6650', message: 'Got a 14-day notice, behind one month. Can someone call me after 5?', date: '2026-10-23', status: 'new' },
    { id: 'q2', resource: 'r1', org: 'efb', name: 'Anonymous', contact: 'text (555) 390-1122', message: 'Do I need proof of address for the pantry?', date: '2026-10-22', status: 'new' },
  ],
  activity: [
    { date: '2026-10-20', org: 'hhc', who: 'Marcus Lee', text: 'shared Oleksandr Kovalenko with Eastside Food Bank, Northgate Family Services, Legal Aid of the Valley' },
    { date: '2026-10-12', org: 'lav', who: 'Grace Whitfield', text: 'added a note to Aisha Mohammed' },
    { date: '2026-10-10', org: 'efb', who: 'Dana Ruiz', text: 'shared Luis Herrera with Riverbend Community Clinic' },
  ],
});

/* ---------- two years of made-up history, so reports have something to show ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TODAY = ymd(new Date());
const ORG_CATS = { efb: ['food'], hhc: ['housing'], nfs: ['childcare', 'jobs'], rhc: ['health', 'transport'], lav: ['legal'] };
const CAT_ORG = { food: 'efb', housing: 'hhc', childcare: 'nfs', jobs: 'nfs', health: 'rhc', transport: 'rhc', legal: 'lav' };

function addHistory(d) {
  let s = 20261024;
  const rnd = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const wpick = pairs => { let r = rnd() * pairs.reduce((a, p) => a + p[1], 0); for (const [v, w] of pairs) { if ((r -= w) < 0) return v; } return pairs[0][0]; };
  const FIRST = ['Ana', 'Ben', 'Carmen', 'Darnell', 'Elena', 'Fatima', 'George', 'Hana', 'Ivan', 'Jasmine', 'Kevin', 'Lena', 'Mohamed', 'Nadia', 'Omar', 'Paula', 'Quinn', 'Rosa', 'Samuel', 'Thu', 'Victor', 'Wanda', 'Xavier', 'Yusuf', 'Zoe', 'Andre', 'Brenda', 'Chloe', 'Diego', 'Esther', 'Farah', 'Hector', 'Irina', 'Jorge', 'Kim', 'Linh', 'Marcus', 'Nora', 'Pedro', 'Rania'];
  const LAST = ['Adams', 'Baker', 'Castillo', 'Dang', 'Ellis', 'Farouk', 'Garcia', 'Hassan', 'Ibrahim', 'Johnson', 'Kim', 'Lopez', 'Martinez', 'Nguyen', 'Ortiz', 'Patel', 'Ramirez', 'Shevchenko', 'Tran', 'Usman', 'Vargas', 'Washington', 'Yilmaz', 'Zhang', 'Brown', 'Diaz', 'Morales', 'Ali', 'Wong', 'Reyes'];
  const LANGS = [['English', 55], ['Spanish', 22], ['Ukrainian', 6], ['Somali', 6], ['Cantonese', 5], ['Vietnamese', 4], ['Arabic', 2]];
  const OWNERS = [['efb', 30], ['hhc', 25], ['nfs', 20], ['rhc', 15], ['lav', 10]];
  const now = new Date(TODAY + 'T12:00');
  const services = [];
  const addServices = c => {
    const start = new Date(c.intake + 'T12:00');
    const months = 2 + Math.floor(rnd() * 7);
    for (let m = 0; m <= months; m++) {
      const dt = new Date(start.getFullYear(), start.getMonth() + m, m ? 1 + Math.floor(rnd() * 28) : start.getDate());
      if (dt > now) break;
      for (const o of [c.owner, ...c.sharedWith]) {
        if (rnd() < (o === c.owner ? 0.8 : 0.6)) {
          const cats = ORG_CATS[o].filter(k => c.needs.includes(k));
          services.push({ date: ymd(dt), org: o, cat: cats[0] || ORG_CATS[o][0], client: c.id });
        }
      }
    }
  };
  d.clients.forEach(c => { c.intake = c.consent.date || c.notes[0].date; addServices(c); });
  let n = 0;
  for (let i = 23; i >= 0; i--) {
    const m0 = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const days = i === 0 ? now.getDate() : new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
    const winter = [10, 11, 0, 1].includes(m0.getMonth()) ? 3 : 0;
    const count = Math.round((5 + (23 - i) * 0.35 + winter + rnd() * 4) * (i === 0 ? days / 30 : 1));
    for (let k = 0; k < count; k++) {
      const owner = wpick(OWNERS);
      const primary = pick(ORG_CATS[owner]);
      const needs = [primary, ...CATS.map(c => c[0]).filter(c => c !== primary && rnd() < 0.18)].slice(0, 3);
      const intake = ymd(new Date(m0.getFullYear(), m0.getMonth(), 1 + Math.floor(rnd() * days)));
      const consent = rnd() < 0.84;
      const sharedWith = consent ? [...new Set(needs.map(x => CAT_ORG[x]).filter(o => o !== owner && rnd() < 0.8))] : [];
      const c = { id: 'g' + (++n), first: pick(FIRST), last: pick(LAST),
        dob: `${1950 + Math.floor(rnd() * 55)}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`,
        phone: `(555) ${100 + Math.floor(rnd() * 899)}-${String(Math.floor(rnd() * 10000)).padStart(4, '0')}`,
        household: wpick([[1, 25], [2, 22], [3, 20], [4, 17], [5, 10], [6, 6]]), language: wpick(LANGS), owner,
        consent: consent ? { given: true, date: intake, by: STAFF[owner] } : { given: false }, sharedWith, external: [], needs, intake,
        notes: [{ org: owner, author: STAFF[owner], date: intake, text: `Intake completed. Main need: ${catName(primary).toLowerCase()}.` }] };
      d.clients.push(c); addServices(c);
    }
    const msgs = ['Can someone call me back about this?', 'Do I need to bring ID?', 'Is there a waitlist right now?', 'I need help this week, please call.', 'What are the income limits?'];
    const reqCount = 2 + Math.floor(rnd() * 5) + Math.floor((23 - i) / 6);
    for (let k = 0; k < reqCount; k++) {
      const r = pick(d.resources);
      const date = ymd(new Date(m0.getFullYear(), m0.getMonth(), 1 + Math.floor(rnd() * days)));
      d.requests.push({ id: 'gq' + i + '-' + k, resource: r.id, org: r.org, name: pick(FIRST) + ' ' + pick(LAST)[0] + '.', contact: `(555) ${100 + Math.floor(rnd() * 899)}-${String(Math.floor(rnd() * 10000)).padStart(4, '0')}`, message: pick(msgs), date, status: (now - new Date(date + 'T12:00')) / 864e5 > 5 ? 'done' : 'new' });
    }
  }
  d.clients.sort((a, b) => b.intake.localeCompare(a.intake));
  d.requests.sort((a, b) => b.date.localeCompare(a.date));
  d.services = services;
  return d;
}
const fresh = () => addHistory(seed());

/* Convert generated demo data into the stored shape used by app.js:
   - archive/<YYYY-MM>: past clients, services and help requests for one month (read-only history)
   - clients, notes, requests, resources, activity: one document per item (what people edit)
   Editing an archived client or request writes a copy to its live collection, which then wins. */
function toSources(d) {
  const src = { archive: {}, clients: {}, notes: {}, requests: {}, resources: {}, activity: {} };
  const month = k => (src.archive[k] ||= { month: k, clients: [], services: [], requests: [] });
  d.clients.forEach(c => month(c.intake.slice(0, 7)).clients.push(c));
  d.services.forEach(s => month(s.date.slice(0, 7)).services.push(s));
  d.requests.forEach(q => month(q.date.slice(0, 7)).requests.push(q));
  d.resources.forEach((r, i) => { src.resources[r.id] = { ...r, order: i }; });
  d.activity.forEach((a, i) => { const id = 'a' + (i + 1); src.activity[id] = { ...a, id, at: a.date + 'T12:00:00.000Z' }; });
  return src;
}

if (typeof module !== 'undefined') module.exports = { CATS, ORGS, STAFF, TODAY, seed, addHistory, fresh, toSources };
