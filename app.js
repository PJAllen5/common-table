(() => {
/* ---------- icons ---------- */
const I = {
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 3v8a3 3 0 0 0 3 3v7M7 3v6M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 1-3 4-3 8h3"/></svg>',
  housing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6"/></svg>',
  health: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>',
  legal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/></svg>',
  jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/></svg>',
  childcare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="6" r="3"/><path d="M6 21v-4a6 6 0 0 1 12 0v4M9 14l-3-2M15 14l3-2"/></svg>',
  transport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="3" width="16" height="14" rx="3"/><path d="M4 11h16M8 21l1-4M16 21l-1-4"/><circle cx="8" cy="14" r=".5"/><circle cx="16" cy="14" r=".5"/></svg>',
  mark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="color:var(--accent-ink)"><path d="M3 10h18M6 10v9M18 10v9M8 6h8"/></svg>',
};

/* ---------- data store ----------
   Live mode: the page's shared database (everyone using the hosted link sees the same data, updated live).
   Local mode: this browser's localStorage, used when the shared database isn't available
   (opening index.html from disk, or a visitor who isn't signed in to Claude). */
const KEY = 'common-table-demo-v3';
const COLLS = ['archive', 'clients', 'notes', 'requests', 'resources', 'activity'];
const clone = x => JSON.parse(JSON.stringify(x));
let src = Object.fromEntries(COLLS.map(c => [c, {}]));
let mode = 'loading';          // 'loading' | 'live' | 'local'
let liveDb = null;
let readOnly = false;
const loaded = new Set();
let db = { clients: [], resources: [], requests: [], activity: [], services: [] };

function rebuild() {
  const clients = new Map(), requests = new Map(), services = [];
  Object.values(src.archive).forEach(a => {
    (a.clients || []).forEach(c => clients.set(c.id, c));
    (a.requests || []).forEach(q => requests.set(q.id, q));
    (a.services || []).forEach(s => services.push(s));
  });
  Object.values(src.clients).forEach(c => clients.set(c.id, c));
  Object.values(src.requests).forEach(q => requests.set(q.id, q));
  const notesBy = {};
  Object.values(src.notes).forEach(n => (notesBy[n.clientId] ||= []).push(n));
  db = {
    clients: [...clients.values()].map(c => {
      const x = clone(c);
      x.baseNotes = x.notes || [];
      x.notes = [...x.baseNotes, ...(notesBy[x.id] || [])].sort((a, b) => (a.date + (a.at || '')).localeCompare(b.date + (b.at || '')));
      return x;
    }).sort((a, b) => b.intake.localeCompare(a.intake)),
    requests: [...requests.values()].map(clone).sort((a, b) => b.date.localeCompare(a.date)),
    resources: Object.values(src.resources).map(clone).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name)),
    activity: Object.values(src.activity).map(clone).sort((a, b) => (b.at || b.date).localeCompare(a.at || a.date)),
    services,
  };
}

const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(src)); } catch {} };

function startLocal() {
  mode = 'local';
  try { src = JSON.parse(localStorage.getItem(KEY)); } catch { src = null; }
  if (!src || !src.archive) { src = toSources(fresh()); saveLocal(); }
  rebuild(); render({ preserve: true });
}

let renderQueued = false;
const scheduleRender = () => { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; rebuild(); render({ preserve: true }); }); };

async function connect() {
  // window.claude exists only inside the Claude artifact viewer.
  for (let i = 0; i < 10 && !window.claude?.use; i++) await new Promise(r => setTimeout(r, 100));
  let cdb = null;
  try { cdb = window.claude?.use ? await window.claude.use('db') : null; } catch { cdb = null; }
  if (!cdb) { startLocal(); return; }
  liveDb = cdb; mode = 'live';
  try { const u = await window.claude.use('user'); if ((await u?.can('data.write')) === false) readOnly = true; } catch {}
  COLLS.forEach(coll => {
    let q = cdb.collection(coll);
    q = coll === 'activity' ? q.orderBy('at', 'desc').limit(300) : q.limit(1000);
    q.onSnapshot(snap => {
      const m = {};
      snap.docs.forEach(d => { if (d.exists) m[d.id] = clone(d.data()); });
      src[coll] = m; loaded.add(coll); scheduleRender();
    }, err => { console.warn('Shared data stopped updating:', coll, err && err.code); });
  });
  render({ preserve: true });
}

const NO_EDIT = 'You can look around, but only people with edit access can change the shared data.';
async function put(coll, id, data) {
  if (readOnly) { rebuild(); render({ preserve: true }); toast(NO_EDIT); return false; }
  const prev = src[coll][id];
  src[coll][id] = clone(data); rebuild();
  if (mode === 'local') { saveLocal(); return true; }
  if (mode !== 'live') return true;
  try { await liveDb.doc(coll + '/' + id).set(clone(data)); return true; }
  catch (e) {
    if (prev === undefined) delete src[coll][id]; else src[coll][id] = prev;
    rebuild(); render({ preserve: true });
    if (e && e.code === 'invalid_argument') { readOnly = true; toast(NO_EDIT); }
    else if (e && e.code === 'quota_exceeded') toast('The shared database is full, so this change was not saved.');
    else toast('This change could not be saved. Check your connection and try again.');
    return false;
  }
}
const clientDoc = c => { const d = { ...c, notes: c.baseNotes ?? c.notes ?? [] }; delete d.baseNotes; return d; };
const saveClient = c => put('clients', c.id, clientDoc(c));
const saveRequest = q => put('requests', q.id, q);
const saveResource = r => put('resources', r.id, r);
const addNote = (c, note) => { const id = uid('n'); return put('notes', id, { ...note, id, clientId: c.id, at: new Date().toISOString() }); };
// Save, then (only if it worked) log it and confirm with a toast.
const commit = (p, msg, logText) => p.then(ok => { if (!ok) return; if (logText) log(logText); if (msg) toast(msg); });
const log = text => { const id = uid('a'); put('activity', id, { id, date: TODAY, at: new Date().toISOString(), org: me(), who: S.session.name, text }); };

const S = { view: 'home', session: null, tab: 'clients', clientId: null, q: '', filter: 'all', pubCat: null, pubQ: '', openNow: false, dialog: null, loginErr: '',
  rScope: 'org', rRange: 6, pivot: 'month', suppress: false, tables: new Set(), present: null };

/* ---------- helpers ---------- */
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = d => d ? new Date(d + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const age = dob => Math.floor((Date.now() - new Date(dob + 'T12:00')) / 3.15576e10);
const dot = o => `<span class="org-dot" style="background:${o.color}" aria-hidden="true">${o.short}</span>`;
const orgChip = id => { const o = org(id); return `<span class="org-chip">${dot(o)}${h(o.name)}</span>`; };
const uid = p => p + Math.random().toString(36).slice(2, 8);
const me = () => S.session && S.session.org;
const canSee = c => c.owner === me() || c.sharedWith.includes(me());
const statusPill = s => ({ available: '<span class="pill ok">Open to new people</span>', limited: '<span class="pill warn">Limited spots</span>', full: '<span class="pill bad">Waitlist only</span>' }[s]);
const isOpenNow = r => { const n = new Date(); const hr = n.getHours() + n.getMinutes() / 60; return r.days.includes(n.getDay()) && hr >= r.open[0] && hr < r.open[1]; };
let toastTimer;
const toast = msg => { document.querySelector('.toast')?.remove(); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2600); };

/* ---------- views ---------- */
function topbar() {
  let right = '';
  if (S.view === 'staff') {
    right = `<div class="who"><span class="org-chip">${dot(org(me()))}${h(org(me()).name)}</span><span class="muted">${h(S.session.name)}</span><button class="btn sm" data-act="logout">Sign out</button></div>`;
  } else if (S.view === 'public') {
    right = `<button class="btn sm ghost" data-act="go-login">Staff sign in</button>`;
  } else if (S.view === 'login') {
    right = `<button class="btn sm sun" data-act="go-public">Find help</button>`;
  }
  return `<header class="topbar"><div class="wrap">
    <button class="brand" data-act="home" aria-label="Common Table home"><span class="brand-mark">${I.mark}</span><span class="brand-name">Common Table</span></button>
    ${modePill()}<div class="spacer"></div>${right}</div></header>`;
}
function modePill() {
  if (mode === 'loading') return '<span class="pill neutral">Connecting…</span>';
  if (mode === 'local') return '<span class="pill neutral" title="Changes are saved only in this browser">Demo · this browser only</span>';
  if (readOnly) return '<span class="pill warn" title="You can view the shared data but not change it">Live · view only</span>';
  return '<span class="pill ok" title="Everyone using this link sees the same data, updated live">● Live · shared</span>';
}

function homeView() {
  return `<main class="wrap home">
    <div class="home-lede">
      <span class="eyebrow">A shared record for ${ORGS.length} partner organizations</span>
      <h1>One intake, every door.</h1>
      <p class="muted">Partner agencies keep client records in one place and share them, with consent, so people don't have to tell their story five times. Anyone can look up food, housing, health and legal help without signing in.</p>
    </div>
    <div class="doors">
      <button class="door public" data-act="go-public">
        <span class="eyebrow">For the public</span>
        <h2>Find help near you</h2>
        <ul><li>Food, housing, health, legal help and more</li><li>See what's open now and who has space</li><li>Ask an organization to contact you</li></ul>
        <span class="go">Browse resources →</span>
      </button>
      <button class="door" data-act="go-login">
        <span class="eyebrow">For partner staff</span>
        <h2>Sign in with your organization</h2>
        <ul><li>Enter and update client records</li><li>Choose which partners can see each record</li><li>Post your programs and current availability</li></ul>
        <span class="go">Staff sign in →</span>
      </button>
    </div>
    <div class="network">${ORGS.map(o => `<span class="org-chip">${dot(o)}${h(o.name)}</span>`).join('')}</div>
    <p class="proto-note"><b>Prototype.</b> Sign-in is simulated, so don't enter real client information. ${mode === 'live'
      ? `This is the live shared version: changes appear for everyone using this link within seconds.${readOnly ? ' You have view-only access, so you can look around but not make changes.' : ''}`
      : mode === 'local' ? 'This copy is a demo with made-up people and organizations. Changes are saved only in this browser. <button class="btn sm ghost" data-act="reset">Reset demo data</button>' : ''}</p>
  </main>`;
}

function loginView() {
  return `<main class="wrap login"><form id="login-form" novalidate>
    <div style="display:grid;gap:4px"><h2>Staff sign in</h2><p class="muted small">Use the account your organization gave you.</p></div>
    <div class="field"><label for="l-org">Organization</label>
      <select id="l-org" required><option value="">Choose your organization</option>${ORGS.map(o => `<option value="${o.id}">${h(o.name)}</option>`).join('')}</select></div>
    <div class="field"><label for="l-email">Work email</label><input id="l-email" type="email" autocomplete="username" placeholder="you@yourorg.org"></div>
    <div class="field"><label for="l-pass">Password</label><input id="l-pass" type="password" autocomplete="current-password"></div>
    ${S.loginErr ? `<p class="err" role="alert">${h(S.loginErr)}</p>` : ''}
    <button class="btn primary" type="submit">Sign in</button>
    <div class="field"><span class="eyebrow">Demo accounts (any password works)</span>
      <div class="demo-accts">${ORGS.map(o => `<button type="button" data-act="demo-login" data-org="${o.id}">${dot(o)}<span><b>${h(STAFF[o.id])}</b><br><span class="muted">${h(o.email)}</span></span></button>`).join('')}</div></div>
  </form></main>`;
}

function staffView() {
  const visible = db.clients.filter(canSee);
  const newReq = db.requests.filter(r => r.org === me() && r.status === 'new').length;
  const tabs = [['clients', 'Clients', visible.length], ['add', 'Add client'], ['resources', 'Our resources'], ['requests', 'Help requests', newReq], ['reports', 'Reports'], ['activity', 'Sharing activity']];
  const cur = S.tab === 'client' ? 'clients' : S.tab;
  const rail = tabs.map(([k, label, n]) => `<button data-act="tab" data-tab="${k}" aria-current="${cur === k}">${label}${n ? `<span class="count">${n}</span>` : ''}</button>`).join('');
  const body = { clients: clientsPane, client: clientPane, add: addPane, resources: resourcesPane, requests: requestsPane, reports: reportsPane, activity: activityPane }[S.tab]();
  return `<main class="wrap staff"><nav class="rail" aria-label="Workspace">${rail}</nav><section class="pane">${body}</section></main>`;
}

function clientsPane() {
  const q = S.q.toLowerCase();
  let list = db.clients.filter(canSee);
  const owned = list.filter(c => c.owner === me()).length;
  if (S.filter === 'own') list = list.filter(c => c.owner === me());
  if (S.filter === 'shared') list = list.filter(c => c.owner !== me());
  if (q) list = list.filter(c => `${c.first} ${c.last} ${c.phone} ${c.language}`.toLowerCase().includes(q));
  const hidden = db.clients.length - db.clients.filter(canSee).length;
  const total = list.length;
  list = list.slice(0, 40);
  const rows = list.map(c => `<tr class="click" data-act="open-client" data-id="${c.id}" tabindex="0">
      <td class="name-cell">${h(c.first)} ${h(c.last)}<div class="muted small">${age(c.dob)} yrs · household of ${c.household}</div></td>
      <td>${c.owner === me() ? '<span class="pill own">Our client</span>' : `<span class="pill shared">From ${h(org(c.owner).name)}</span>`}</td>
      <td><div class="tags">${c.needs.map(n => `<span class="pill neutral">${catName(n)}</span>`).join('')}</div></td>
      <td>${c.consent.given ? '<span class="pill ok">Consent on file</span>' : '<span class="pill bad">No consent</span>'}</td>
      <td class="small muted">${fmtDate(c.notes.at(-1)?.date)}</td></tr>`).join('');
  return `<div class="pane-head"><div><span class="eyebrow">${h(org(me()).name)}</span><h2>Clients</h2></div>
      <button class="btn primary" data-act="tab" data-tab="add">+ Add client</button></div>
    <div class="stat-row">
      <div class="stat"><b>${owned}</b><span>Our clients</span></div>
      <div class="stat"><b>${db.clients.filter(canSee).length - owned}</b><span>Shared with us</span></div>
      <div class="stat"><b>${hidden}</b><span>Not shared with us</span></div>
    </div>
    <div class="toolbar">
      <input id="c-search" type="search" placeholder="Search name, phone, language" value="${h(S.q)}" aria-label="Search clients">
      <select id="c-filter" aria-label="Filter clients">
        <option value="all" ${S.filter === 'all' ? 'selected' : ''}>All I can see</option>
        <option value="own" ${S.filter === 'own' ? 'selected' : ''}>Our clients</option>
        <option value="shared" ${S.filter === 'shared' ? 'selected' : ''}>Shared with us</option>
      </select>
    </div>
    ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Client</th><th>Record</th><th>Needs</th><th>Consent</th><th>Last note</th></tr></thead><tbody>${rows}</tbody></table></div>${total > list.length ? `<p class="small muted">Showing the ${list.length} most recent of ${total}. Search to find others.</p>` : ''}`
      : `<div class="empty">${mode === 'loading' ? 'Loading shared records…' : !db.clients.length ? 'No client records yet. Use “Add client” to enter the first one.' : 'No clients match. Try a different search, or add a new client.'}</div>`}`;
}

function clientPane() {
  const c = db.clients.find(x => x.id === S.clientId);
  if (!c || !canSee(c)) { S.tab = 'clients'; return clientsPane(); }
  const mine = c.owner === me();
  const notes = [...c.notes].reverse().map(n => `<div class="note" style="border-color:${org(n.org).color}">
      <div class="note-meta">${dot(org(n.org))}<b>${h(org(n.org).name)}</b><span>${h(n.author)}</span><span>${fmtDate(n.date)}</span></div><p>${h(n.text)}</p></div>`).join('');

  const shareRows = ORGS.filter(o => o.id !== c.owner).map(o => `<div class="share-row"><label>
      <input type="checkbox" data-act="toggle-share" data-org="${o.id}" ${c.sharedWith.includes(o.id) ? 'checked' : ''} ${!mine || !c.consent.given ? 'disabled' : ''}>
      ${dot(o)}${h(o.name)}</label></div>`).join('');
  const external = c.external.map(e => `<div class="share-row"><label style="cursor:default"><span class="org-dot" style="background:var(--muted)">@</span>${h(e)}</label>
      ${mine ? `<button class="btn sm ghost" data-act="remove-ext" data-email="${h(e)}">Remove</button>` : ''}</div>`).join('');

  const consent = c.consent.given
    ? `<div class="consent given"><b>Client consented to sharing</b><span class="small">Signed ${fmtDate(c.consent.date)}, recorded by ${h(c.consent.by)}.</span>
        ${mine ? `<button class="btn sm" style="justify-self:start" data-act="revoke">Withdraw consent and stop all sharing</button>` : ''}</div>`
    : `<div class="consent"><b>No sharing consent on file</b><span class="small">This record stays with ${h(org(c.owner).name)} until the client agrees to share it.</span>
        ${mine ? `<button class="btn sm primary" style="justify-self:start" data-act="consent">Record client consent</button>` : ''}</div>`;

  return `<button class="btn sm ghost back" data-act="tab" data-tab="clients">← All clients</button>
    <div class="pane-head"><div>
      <span class="eyebrow">${mine ? 'Our client' : 'Shared by ' + h(org(c.owner).name)}</span>
      <h2>${h(c.first)} ${h(c.last)}</h2></div>
      <div class="tags">${c.needs.map(n => `<span class="pill neutral">${catName(n)}</span>`).join('')}</div></div>
    <div class="detail">
      <div style="display:grid;gap:20px;min-width:0">
        <div class="panel"><h3>Profile</h3>
          <dl class="kv"><dt>Date of birth</dt><dd>${fmtDate(c.dob)} (${age(c.dob)})</dd>
            <dt>Phone</dt><dd>${h(c.phone)}</dd><dt>Household size</dt><dd>${c.household}</dd>
            <dt>Language</dt><dd>${h(c.language)}</dd><dt>Record held by</dt><dd>${orgChip(c.owner)}</dd></dl></div>
        <div class="panel"><h3>Case notes from every partner</h3>
          <form id="note-form" class="field"><label for="n-text">Add a note as ${h(org(me()).name)}</label>
            <textarea id="n-text" placeholder="What happened, what's next, who follows up"></textarea>
            <button class="btn primary" style="justify-self:start" type="submit">Add note</button></form>
          ${notes}</div>
      </div>
      <div class="panel"><h3>Who can see this record</h3>
        ${consent}
        ${mine ? '' : `<div class="lock"><span aria-hidden="true">🔒</span><span>Only ${h(org(c.owner).name)} can change who sees this record. You can read it and add notes.</span></div>`}
        <div><span class="eyebrow">Partner organizations</span>${shareRows}</div>
        <div><span class="eyebrow">People outside the network</span>
          ${external || '<p class="small muted" style="padding:6px 0">Not shared with anyone outside the network.</p>'}
          ${mine && c.consent.given ? `<form id="ext-form" class="inline-form" style="margin-top:8px"><input id="ext-email" type="email" placeholder="caseworker@agency.gov" aria-label="Email to share with"><button class="btn sm" type="submit">Share</button></form>` : ''}
        </div>
      </div>
    </div>`;
}

function addPane() {
  return `<div class="pane-head"><div><span class="eyebrow">New record for ${h(org(me()).name)}</span><h2>Add a client</h2></div></div>
  <form id="add-form" class="panel" novalidate>
    <div class="form-grid">
      <div class="field"><label for="a-first">First name</label><input id="a-first" type="text" required></div>
      <div class="field"><label for="a-last">Last name</label><input id="a-last" type="text" required></div>
      <div class="field"><label for="a-dob">Date of birth</label><input id="a-dob" type="date"></div>
      <div class="field"><label for="a-phone">Phone</label><input id="a-phone" type="tel" placeholder="(555) 000-0000"></div>
      <div class="field"><label for="a-house">Household size</label><input id="a-house" type="text" inputmode="numeric" value="1"></div>
      <div class="field"><label for="a-lang">Preferred language</label><input id="a-lang" type="text" value="English"></div>
      <div class="field full"><label>Needs</label><div class="checks">${CATS.map(([k, n]) => `<label><input type="checkbox" id="need-${k}" name="need" value="${k}"> ${n}</label>`).join('')}</div></div>
      <div class="field full"><label for="a-note">First note</label><textarea id="a-note" placeholder="Reason for visit, situation, next steps"></textarea></div>
      <div class="field full"><div class="consent"><label class="switch"><input type="checkbox" id="a-consent"> Client agrees to share this record with partner organizations</label>
        <span class="small muted">Without consent the record stays private to your organization. You can record consent later.</span></div></div>
      <div class="field full"><label>Share with</label><div class="checks">${ORGS.filter(o => o.id !== me()).map(o => `<label><input type="checkbox" id="share-${o.id}" name="share" value="${o.id}"> ${h(o.name)}</label>`).join('')}</div></div>
    </div>
    <p class="err" id="add-err" role="alert" hidden></p>
    <div class="toolbar"><button class="btn primary" type="submit">Save client</button><button class="btn ghost" type="button" data-act="tab" data-tab="clients">Cancel</button></div>
  </form>`;
}

function resCard(r, staff) {
  const o = org(r.org);
  return `<article class="res">
    <div class="res-top"><div><span class="eyebrow">${catName(r.cat)}${staff ? '' : ' · ' + h(o.name)}</span><h3>${h(r.name)}</h3></div>${statusPill(r.status)}</div>
    <p>${h(r.desc)}</p>
    <div class="res-facts">
      <span><b>Where</b>${h(r.address)}</span><span><b>When</b>${h(r.hours)}${isOpenNow(r) ? ' · <span class="pill ok">Open now</span>' : ''}</span>
      <span><b>Call</b>${h(r.phone)}</span><span><b>Who can get it</b>${h(r.eligibility)}</span>
      <span><b>Languages</b>${h(r.languages)}</span></div>
    <div class="res-actions">${staff
      ? `<label class="small" for="st-${r.id}"><b>Availability</b></label><select id="st-${r.id}" data-act="set-status" data-id="${r.id}" style="width:auto">
          ${['available', 'limited', 'full'].map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${{ available: 'Open to new people', limited: 'Limited spots', full: 'Waitlist only' }[s]}</option>`).join('')}</select>
          <button class="btn sm" data-act="edit-res" data-id="${r.id}">Edit</button>`
      : `<button class="btn sm primary" data-act="ask-help" data-id="${r.id}">Ask them to contact me</button><button class="btn sm" data-act="copy" data-text="${h(r.phone)}">Copy phone number</button>`}</div>
  </article>`;
}

function resourcesPane() {
  const list = db.resources.filter(r => r.org === me());
  return `<div class="pane-head"><div><span class="eyebrow">Shown to the public and all partners</span><h2>Our resources</h2></div>
    <button class="btn primary" data-act="edit-res">+ Add resource</button></div>
    <div class="res-list">${list.map(r => resCard(r, true)).join('') || '<div class="empty">You haven\'t listed any programs yet.</div>'}</div>`;
}

function requestsPane() {
  const list = db.requests.filter(r => r.org === me());
  return `<div class="pane-head"><div><span class="eyebrow">Sent from the public resource finder</span><h2>Help requests</h2></div></div>
  ${list.length ? `<div class="table-wrap"><table><thead><tr><th>From</th><th>About</th><th>Message</th><th>Received</th><th></th></tr></thead><tbody>
    ${list.map(q => `<tr><td class="name-cell">${h(q.name)}<div class="small muted">${h(q.contact)}</div></td><td>${h(db.resources.find(r => r.id === q.resource)?.name)}</td>
      <td style="min-width:220px">${h(q.message)}</td><td class="small muted">${fmtDate(q.date)}</td>
      <td>${q.status === 'new' ? `<button class="btn sm" data-act="req-done" data-id="${q.id}">Mark contacted</button>` : '<span class="pill ok">Contacted</span>'}</td></tr>`).join('')}
  </tbody></table></div>` : '<div class="empty">No requests yet. When someone asks for help through the public finder, it shows up here.</div>'}`;
}

function activityPane() {
  const list = db.activity.filter(a => a.org === me() || a.text.includes(org(me()).name));
  return `<div class="pane-head"><div><span class="eyebrow">Audit trail</span><h2>Sharing activity</h2></div></div>
  <p class="muted small">Every time a record is shared, unshared or updated by a partner, it is logged here.</p>
  ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Organization</th><th>What happened</th></tr></thead><tbody>
    ${list.map(a => `<tr><td class="small muted" style="white-space:nowrap">${fmtDate(a.date)}</td><td>${orgChip(a.org)}</td><td><b>${h(a.who)}</b> ${h(a.text)}</td></tr>`).join('')}
  </tbody></table></div>` : '<div class="empty">No activity yet.</div>'}`;
}

function publicView() {
  const q = S.pubQ.toLowerCase();
  let list = db.resources;
  if (S.pubCat) list = list.filter(r => r.cat === S.pubCat);
  if (S.openNow) list = list.filter(isOpenNow);
  if (q) list = list.filter(r => `${r.name} ${r.desc} ${r.address} ${org(r.org).name} ${r.languages} ${catName(r.cat)}`.toLowerCase().includes(q));
  const order = { available: 0, limited: 1, full: 2 };
  list = [...list].sort((a, b) => order[a.status] - order[b.status]);
  return `<section class="pub-hero"><div class="wrap">
      <h1>What do you need help with?</h1>
      <p class="muted">Free and low-cost help from ${ORGS.length} local organizations. No sign-in needed.</p>
      <div class="searchbar"><input id="p-search" type="search" placeholder="Try “rent”, “groceries”, “Spanish”, “doctor”" value="${h(S.pubQ)}" aria-label="Search resources"></div>
      <div class="cats" role="group" aria-label="Categories">
        <button class="cat" data-act="pub-cat" data-cat="" aria-pressed="${!S.pubCat}">Everything</button>
        ${CATS.map(([k, n]) => `<button class="cat" data-act="pub-cat" data-cat="${k}" aria-pressed="${S.pubCat === k}">${I[k]}${n}</button>`).join('')}</div>
    </div></section>
    <main class="wrap pub-body">
      <div class="pub-row"><p><b>${list.length}</b> ${list.length === 1 ? 'place' : 'places'} found${S.pubCat ? ' for ' + catName(S.pubCat).toLowerCase() : ''}</p>
        <label class="switch"><input type="checkbox" id="p-open" ${S.openNow ? 'checked' : ''}> Open right now</label></div>
      <div class="res-list">${list.map(r => resCard(r, false)).join('') || `<div class="empty">${mode === 'loading' ? 'Loading programs…' : !db.resources.length ? 'No programs are listed yet. Partner organizations add theirs after signing in.' : 'Nothing matches that. Try another word, or turn off “Open right now”.'}</div>`}</div>
      <div class="help-box"><h3>Not sure where to start?</h3><p class="muted">Call the community helpline at <b>211</b>, any time, any language. They can connect you to every organization on this list.</p></div>
    </main>`;
}

/* ---------- reports ---------- */
const TAG = { efb: 'Food Bank', hhc: 'Housing', nfs: 'Family Svcs', rhc: 'Clinic', lav: 'Legal Aid' };
const SHEETS = {};
const fmtN = v => Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1);
const monthsEnding = (n, endKey) => { const [y, m] = endKey.split('-').map(Number); const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`); } return out; };
const mLabel = (k, yr) => new Date(k + '-15T12:00').toLocaleDateString(undefined, yr ? { month: 'short', year: 'numeric' } : { month: 'short' });
const niceMax = v => { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(x => n <= x) * p; };
const topRound = (x, y, w, hh, r) => { r = Math.min(r, hh, w / 2); return `M${x},${y + hh}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh}Z`; };
const rightRound = (x, y, w, hh, r) => { r = Math.min(r, w, hh / 2); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh - r}Q${x + w},${y + hh} ${x + w - r},${y + hh}H${x}Z`; };
const rangeName = () => ({ 3: 'last 3 months', 6: 'last 6 months', 12: 'last 12 months' }[S.rRange]);
const scopeName = () => S.rScope === 'network' ? 'All partner organizations' : org(me()).name;

function rdata() {
  const end = TODAY.slice(0, 7);
  const months = monthsEnding(S.rRange, end);
  const prev = monthsEnding(S.rRange, monthsEnding(S.rRange + 1, end)[0]);
  const net = S.rScope === 'network';
  const inM = (d, ms) => ms.includes(d.slice(0, 7));
  const svc = ms => db.services.filter(s => inM(s.date, ms) && (net || s.org === me()));
  const intakes = ms => db.clients.filter(c => inM(c.intake, ms) && (net || c.owner === me()));
  const cById = Object.fromEntries(db.clients.map(c => [c.id, c]));
  const S1 = svc(months), S0 = svc(prev), N1 = intakes(months), N0 = intakes(prev);
  const served = [...new Set(S1.map(s => s.client))].map(id => cById[id]).filter(Boolean);
  const served0 = new Set(S0.map(s => s.client)).size;
  const reqs = db.requests.filter(q => inM(q.date, months) && (net || q.org === me()));
  const sharedNet = db.clients.filter(c => inM(c.intake, months));
  return { months, net, S1, S0, N1, N0, served, served0, reqs, sharedNet };
}

function colChart(labels, series, o = {}) {
  const W = o.w || 560, H = o.h || 230, fs = o.fs || 11, L = fs * 3.2, R = 10, T = fs * 1.8, B = fs * 2.4;
  const totals = labels.map((_, i) => series.reduce((a, s) => a + s.values[i], 0));
  const max = niceMax(Math.max(1, ...totals));
  const pw = W - L - R, ph = H - T - B, band = pw / labels.length, bw = Math.min(fs * 3.4, band * 0.62);
  const y = v => T + ph - v / max * ph;
  let g = '';
  for (let i = 0; i <= 4; i++) { const v = max * i / 4, yy = y(v); g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="var(--${i ? 'grid' : 'axis'})"/><text x="${L - 6}" y="${yy + fs * 0.35}" text-anchor="end" font-size="${fs}">${fmtN(v)}</text>`; }
  const every = band < fs * 3 ? 2 : 1;
  labels.forEach((lab, i) => {
    const x = L + band * i + (band - bw) / 2;
    let acc = 0;
    const segs = series.map(s => ({ s, v: s.values[i] })).filter(d => d.v > 0);
    segs.forEach((d, j) => {
      const yTop = y(acc + d.v), yBot = y(acc) - (j ? 2 : 0);
      acc += d.v;
      const tip = h(`${o.tipLabels ? o.tipLabels[i] : lab}${d.s.name ? ' · ' + d.s.name : ''}: ${d.v.toLocaleString()}`);
      g += j === segs.length - 1
        ? `<path d="${topRound(x, yTop, bw, Math.max(0, yBot - yTop), 4)}" fill="${d.s.color}" data-tip="${tip}"/>`
        : `<rect x="${x}" y="${yTop}" width="${bw}" height="${Math.max(0, yBot - yTop)}" fill="${d.s.color}" data-tip="${tip}"/>`;
    });
    if (i % every === (labels.length - 1) % every) g += `<text x="${x + bw / 2}" y="${H - B + fs * 1.5}" text-anchor="middle" font-size="${fs}">${h(lab)}</text>`;
  });
  const li = labels.length - 1, lx = L + band * li + band / 2;
  g += `<text class="lbl" x="${lx}" y="${y(totals[li]) - 6}" text-anchor="middle" font-size="${fs}">${totals[li].toLocaleString()}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${h(o.label || '')}">${g}</svg>`;
}

function hbarChart(items, o = {}) {
  const W = o.w || 560, fs = o.fs || 11, row = fs * 2.5, LW = o.labelW || fs * 10, R = fs * 4;
  const H = items.length * row;
  const max = Math.max(1, ...items.map(d => d.value));
  let g = `<line x1="${LW}" x2="${LW}" y1="0" y2="${H}" stroke="var(--axis)"/>`;
  items.forEach((d, i) => {
    const yy = i * row + row * 0.18, bh = row * 0.64, w = Math.max(d.value ? 2 : 0, d.value / max * (W - LW - R));
    g += `<text x="${LW - 8}" y="${yy + bh / 2 + fs * 0.35}" text-anchor="end" font-size="${fs}" style="fill:var(--fg)">${h(d.label)}</text>`;
    if (w) g += `<path d="${rightRound(LW, yy, w, bh, 4)}" fill="${d.color || 'var(--s1)'}" data-tip="${h(d.label + ': ' + d.value.toLocaleString() + (d.extra || ''))}"/>`;
    g += `<text class="lbl" x="${LW + w + 6}" y="${yy + bh / 2 + fs * 0.35}" font-size="${fs}">${d.value.toLocaleString()}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${h(o.label || '')}">${g}</svg>`;
}

function heatmap(rowIds, colIds, val, o = {}) {
  const W = o.w || 560, fs = o.fs || 11, LW = fs * 8.5, HH = fs * 2.6, cw = (W - LW) / colIds.length, ch = fs * 3.2;
  const H = HH + rowIds.length * ch;
  const all = rowIds.flatMap(r => colIds.filter(c => c !== r).map(c => val(r, c)));
  const max = Math.max(1, ...all);
  let g = '';
  colIds.forEach((c, j) => { g += `<text x="${LW + cw * j + cw / 2}" y="${HH - fs * 0.9}" text-anchor="middle" font-size="${fs}">${h(TAG[c])}</text>`; });
  rowIds.forEach((r, i) => {
    const yy = HH + i * ch;
    g += `<text x="${LW - 8}" y="${yy + ch / 2 + fs * 0.35}" text-anchor="end" font-size="${fs}" style="fill:var(--fg)${r === me() ? ';font-weight:700' : ''}">${h(TAG[r])}</text>`;
    colIds.forEach((c, j) => {
      const x = LW + cw * j;
      if (r === c) { g += `<rect x="${x + 1}" y="${yy + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" fill="var(--sunk)"/><text x="${x + cw / 2}" y="${yy + ch / 2 + fs * 0.35}" text-anchor="middle" font-size="${fs}">—</text>`; return; }
      const v = val(r, c), step = v ? Math.min(5, 1 + Math.floor(v / max * 4.999)) : 0;
      g += `<rect x="${x + 1}" y="${yy + 1}" width="${cw - 2}" height="${ch - 2}" rx="4" fill="${step ? `var(--seq${step})` : 'var(--sunk)'}" data-tip="${h(`${org(r).name} shared ${v} new client${v === 1 ? '' : 's'} with ${org(c).name}`)}"/>`
        + `<text x="${x + cw / 2}" y="${yy + ch / 2 + fs * 0.35}" text-anchor="middle" font-size="${fs}" style="fill:${step >= 4 ? 'var(--bg)' : 'var(--fg)'};font-weight:700">${v}</text>`;
    });
  });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${h(o.label || '')}">${g}</svg>`;
}

const orgLegend = () => `<div class="legend">${ORGS.map(o => `<span><i style="background:${o.color}"></i>${h(o.name)}</span>`).join('')}</div>`;

function chartDefs(R) {
  const ml = R.months.map(m => mLabel(m)), mlY = R.months.map((m, i) => mLabel(m, true) + (i === R.months.length - 1 ? ' (so far)' : ''));
  const intakeVals = R.months.map(m => R.N1.filter(c => c.intake.startsWith(m)).length);
  const svcSeries = R.net
    ? ORGS.map(o => ({ name: o.name, color: o.color, values: R.months.map(m => R.S1.filter(s => s.org === o.id && s.date.startsWith(m)).length) }))
    : [{ name: '', color: 'var(--s1)', values: R.months.map(m => R.S1.filter(s => s.date.startsWith(m)).length) }];
  const needs = CATS.map(([k, n]) => ({ label: n, value: R.served.filter(c => c.needs.includes(k)).length })).sort((a, b) => b.value - a.value);
  const langCounts = {}; R.served.forEach(c => { langCounts[c.language] = (langCounts[c.language] || 0) + 1; });
  let langs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
  if (langs.length > 6) langs = [...langs.slice(0, 5), ['Other', langs.slice(5).reduce((a, x) => a + x[1], 0)]];
  const langItems = langs.map(([label, value]) => ({ label, value }));
  const HB = ['1', '2', '3', '4', '5', '6+'];
  const hhVals = HB.map((b, i) => R.served.filter(c => (i === 5 ? c.household >= 6 : c.household === i + 1)).length);
  const shareVal = (a, b) => R.sharedNet.filter(c => c.owner === a && c.sharedWith.includes(b)).length;
  const ids = ORGS.map(o => o.id);
  return [
    { id: 'intakes', title: 'New clients each month', sub: `${scopeName()} · ${rangeName()} · this month is still in progress`,
      svg: o => colChart(ml, [{ name: '', color: 'var(--s1)', values: intakeVals }], { ...o, tipLabels: mlY, label: 'New clients per month' }),
      table: [['Month', 'New clients'], ...R.months.map((m, i) => [mLabel(m, true), intakeVals[i]])] },
    { id: 'services', title: 'Services delivered each month', sub: R.net ? 'Stacked by organization' : `${scopeName()} · visits, pickups and appointments`,
      legend: R.net ? orgLegend() : '',
      svg: o => colChart(ml, svcSeries, { ...o, tipLabels: mlY, label: 'Services per month' }),
      table: [['Month', ...svcSeries.map(s => s.name || 'Services')], ...R.months.map((m, i) => [mLabel(m, true), ...svcSeries.map(s => s.values[i])])] },
    { id: 'needs', title: 'What people needed', sub: 'People served, by type of need. One person can have several needs.',
      svg: o => hbarChart(needs, { ...o, label: 'People served by need' }),
      table: [['Need', 'People served'], ...needs.map(d => [d.label, d.value])] },
    { id: 'langs', title: 'Languages spoken', sub: 'People served, by preferred language',
      svg: o => hbarChart(langItems, { ...o, label: 'People served by language' }),
      table: [['Language', 'People served'], ...langItems.map(d => [d.label, d.value])] },
    { id: 'sharing', title: 'Who shares records with whom', sub: 'New clients shared between partners. Row shares with column. Whole network, counts only.', wide: true,
      svg: o => heatmap(ids, ids, shareVal, { ...o, label: 'Record sharing between organizations' }),
      table: [['Shared by \\ with', ...ids.map(i => TAG[i])], ...ids.map(r => [TAG[r], ...ids.map(c => r === c ? '' : shareVal(r, c))])] },
    { id: 'household', title: 'Household size', sub: 'People served, by number of people in their household', wide: true,
      svg: o => colChart(HB, [{ name: '', color: 'var(--s1)', values: hhVals }], { ...o, tipLabels: HB.map(b => `Household of ${b}`), label: 'Household size' }),
      table: [['Household size', 'People served'], ...HB.map((b, i) => [b, hhVals[i]])] },
  ];
}

const tableHTML = rows => `<div class="table-wrap"><table class="sheet"><thead><tr>${rows[0].map((c, i) => `<th class="${i ? 'num' : ''}">${h(c)}</th>`).join('')}</tr></thead>
  <tbody>${rows.slice(1).map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${h(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function kpiHTML(R) {
  const delta = (a, b) => { if (!b) return ''; const p = Math.round((a - b) / b * 100); return `<em class="muted">${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}% vs previous ${S.rRange} mo</em>`; };
  const consent = R.N1.length ? Math.round(R.N1.filter(c => c.consent.given).length / R.N1.length * 100) : 0;
  const shared = R.N1.length ? Math.round(R.N1.filter(c => c.sharedWith.length).length / R.N1.length * 100) : 0;
  const answered = R.reqs.filter(q => q.status === 'done').length;
  return `<div class="kpis">
    <div class="kpi"><span>People served</span><b>${R.served.length.toLocaleString()}</b>${delta(R.served.length, R.served0)}</div>
    <div class="kpi"><span>New clients</span><b>${R.N1.length.toLocaleString()}</b>${delta(R.N1.length, R.N0.length)}</div>
    <div class="kpi"><span>Services delivered</span><b>${R.S1.length.toLocaleString()}</b>${delta(R.S1.length, R.S0.length)}</div>
    <div class="kpi"><span>New clients with sharing consent</span><b>${consent}%</b></div>
    <div class="kpi"><span>New clients shared with a partner</span><b>${shared}%</b></div>
    <div class="kpi"><span>Help requests from the public</span><b>${R.reqs.length}</b><em class="muted">${answered} answered</em></div>
  </div>`;
}

function pivotRows(R) {
  const base = R.N1;
  const dims = {
    month: { name: 'Month', key: c => c.intake.slice(0, 7), order: R.months, label: k => mLabel(k, true) },
    org: { name: 'Organization', key: c => c.owner, order: ORGS.map(o => o.id), label: k => org(k).name },
    language: { name: 'Language', key: c => c.language, order: [...new Set(base.map(c => c.language))].sort(), label: k => k },
    household: { name: 'Household size', key: c => c.household >= 6 ? '6+' : String(c.household), order: ['1', '2', '3', '4', '5', '6+'], label: k => k },
  };
  const d = dims[S.pivot];
  const cell = n => S.suppress && n > 0 && n < 5 ? '<5' : n;
  const rows = [[d.name, ...CATS.map(c => c[1]), 'New clients']];
  d.order.forEach(k => {
    const grp = base.filter(c => d.key(c) === k);
    if (S.pivot !== 'month' && !grp.length) return;
    rows.push([d.label(k), ...CATS.map(([ck]) => cell(grp.filter(c => c.needs.includes(ck)).length)), cell(grp.length)]);
  });
  rows.push(['Total', ...CATS.map(([ck]) => cell(base.filter(c => c.needs.includes(ck)).length)), cell(base.length)]);
  return rows;
}

function rawRows(R) {
  const mine = db.clients.filter(c => c.owner === me() && R.months.includes(c.intake.slice(0, 7)));
  const ageBand = dob => { const a = age(dob); return a < 25 ? '18–24' : a < 40 ? '25–39' : a < 60 ? '40–59' : '60+'; };
  return [['Record ID', 'Intake month', 'Age group', 'Household', 'Language', 'Needs', 'Consent', 'Shared with', 'Services from us'],
    ...mine.map(c => ['CT-' + c.id.toUpperCase(), mLabel(c.intake.slice(0, 7), true), ageBand(c.dob), c.household, c.language, c.needs.map(catName).join('; '),
      c.consent.given ? 'Yes' : 'No', c.sharedWith.map(x => TAG[x]).join('; ') || '—', R.S1.filter(s => s.client === c.id && s.org === me()).length])];
}

function reportsPane() {
  const R = rdata();
  const defs = chartDefs(R);
  const pv = pivotRows(R), raw = rawRows(R);
  SHEETS.pivot = pv; SHEETS.raw = raw;
  const cards = defs.map(c => {
    SHEETS[c.id] = c.table;
    const tbl = S.tables.has(c.id);
    return `<div class="chart ${c.wide ? 'wide' : ''}"><div class="chart-head"><div><h3>${c.title}</h3><p class="small muted">${c.sub}</p></div>
      <div class="toolbar"><button class="btn sm ghost" data-act="toggle-table" data-id="${c.id}">${tbl ? 'Show chart' : 'Show table'}</button><button class="btn sm ghost" data-act="copy-sheet" data-id="${c.id}">Copy data</button></div></div>
      ${c.legend || ''}${tbl ? tableHTML(c.table) : c.svg(c.wide ? { w: 720, fs: 13 } : { w: 400, h: 260, fs: 12.5 })}</div>`;
  }).join('');
  const seg = (act, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
  return `<div class="pane-head"><div><span class="eyebrow">Reports</span><h2>${h(scopeName())}, ${rangeName()}</h2></div>
      <button class="btn primary" data-act="present">Present as slides</button></div>
    <div class="toolbar">${seg('r-scope', S.rScope, [['org', 'Our organization'], ['network', 'Whole network']])}${seg('r-range', S.rRange, [[3, '3 months'], [6, '6 months'], [12, '12 months']])}</div>
    ${R.net ? '<div class="privacy"><span aria-hidden="true">🔒</span><span>Network reports show counts only. No names or contact details leave the organization that holds the record.</span></div>' : ''}
    ${kpiHTML(R)}
    <div class="charts">${cards}</div>
    <div class="chart"><div class="chart-head"><div><h3>Spreadsheet: new clients by need</h3><p class="small muted">Pick how to break it down, then copy it into Excel or Google Sheets.</p></div>
      <button class="btn sm" data-act="copy-sheet" data-id="pivot">Copy spreadsheet</button></div>
      <div class="toolbar"><label class="small" for="r-pivot"><b>Rows</b></label>
        <select id="r-pivot" style="width:auto">${[['month', 'Month'], ['org', 'Organization'], ['language', 'Language'], ['household', 'Household size']].map(([v, l]) => `<option value="${v}" ${S.pivot === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <label class="switch small"><input type="checkbox" id="r-suppress" ${S.suppress ? 'checked' : ''}> Hide counts under 5 (for public reports)</label></div>
      ${tableHTML(pv).replace(/<tr>(<td[^>]*>Total<\/td>)/, '<tr class="total">$1')}</div>
    <div class="chart"><div class="chart-head"><div><h3>Our client list, without names</h3><p class="small muted">${raw.length - 1} new ${org(me()).name} clients in the ${rangeName()}. Only your own clients appear here.</p></div>
      <button class="btn sm" data-act="copy-sheet" data-id="raw">Copy all ${raw.length - 1} rows</button></div>
      ${raw.length > 1 ? tableHTML(raw.slice(0, 11)) + (raw.length > 11 ? `<p class="small muted">Showing 10 of ${raw.length - 1}. Copy to get every row.</p>` : '') : '<div class="empty">No new clients in this period.</div>'}</div>`;
}

function presentHTML() {
  if (S.present == null) return '';
  const R = rdata();
  const defs = chartDefs(R);
  const big = { w: 900, h: 400, fs: 15 };
  const slides = [
    { body: `<div class="slide-inner" style="gap:14px"><span class="eyebrow">Common Table · Impact report</span><h1>${h(scopeName())}</h1><p class="muted" style="font-size:1.25rem">${rangeName()[0].toUpperCase() + rangeName().slice(1)}, ${mLabel(R.months[0], true)} to ${mLabel(R.months.at(-1), true)}</p>${R.net ? '' : orgChip(me())}</div>` },
    { body: `<div class="slide-inner"><h2>At a glance</h2>${kpiHTML(R)}</div>` },
    ...defs.map(c => ({ body: `<div class="slide-inner"><div style="display:grid;gap:4px"><h2>${c.title}</h2><p class="muted">${c.sub}</p></div>${c.legend || ''}${c.svg(c.id === 'needs' || c.id === 'langs' ? { ...big, labelW: 170 } : big)}</div>` })),
  ];
  const i = Math.max(0, Math.min(S.present, slides.length - 1)); S.present = i;
  return `<div class="present chart" role="dialog" aria-modal="true" aria-label="Presentation" style="border:0;border-radius:0">
    <div class="present-bar"><span class="small muted">Slide ${i + 1} of ${slides.length} · use ← → keys</span><button class="btn sm" data-act="slide-exit">Exit presentation</button></div>
    <div class="slide">${slides[i].body}</div>
    <div class="present-bar"><button class="btn" data-act="slide-prev" ${i ? '' : 'disabled'}>← Back</button>
      <div class="slide-dots">${slides.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn primary" data-act="slide-next" ${i < slides.length - 1 ? '' : 'disabled'}>Next →</button></div></div>`;
}

/* chart tooltips */
const tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.hidden = true; document.body.appendChild(tipEl);
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!t) { tipEl.hidden = true; return; }
  tipEl.textContent = t.getAttribute('data-tip'); tipEl.hidden = false;
  const x = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 8), y = Math.max(8, e.clientY - tipEl.offsetHeight - 10);
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
});
document.addEventListener('keydown', e => {
  if (S.present == null) return;
  if (e.key === 'ArrowRight') { S.present++; render(); }
  if (e.key === 'ArrowLeft' && S.present > 0) { S.present--; render(); }
  if (e.key === 'Escape') { S.present = null; try { document.fullscreenElement && document.exitFullscreen(); } catch {} render(); }
});
const toTSV = rows => rows.map(r => r.map(c => String(c).replace(/[\t\n]/g, ' ')).join('\t')).join('\n');

/* ---------- dialogs ---------- */
function dialogHTML() {
  const d = S.dialog;
  if (!d) return '';
  if (d.type === 'ask') {
    const r = db.resources.find(x => x.id === d.id);
    return `<div class="scrim" data-act="close-dialog"><form class="dialog" id="ask-form" role="dialog" aria-modal="true" aria-labelledby="ask-title">
      <div><span class="eyebrow">${h(org(r.org).name)}</span><h2 id="ask-title">Ask about ${h(r.name)}</h2></div>
      <p class="small muted">Someone from ${h(org(r.org).name)} will reach out. Only share what you're comfortable with.</p>
      <div class="field"><label for="q-name">Your name (or leave blank)</label><input id="q-name" type="text" placeholder="First name is fine"></div>
      <div class="field"><label for="q-contact">How should they reach you?</label><input id="q-contact" type="text" placeholder="Phone, text or email" required></div>
      <div class="field"><label for="q-msg">What do you need?</label><textarea id="q-msg"></textarea></div>
      <p class="err" id="q-err" role="alert" hidden></p>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-act="close-dialog">Cancel</button><button class="btn primary" type="submit">Send request</button></div></form></div>`;
  }
  if (d.type === 'res') {
    const r = db.resources.find(x => x.id === d.id) || { cat: 'food', name: '', desc: '', address: '', hours: '', phone: '', eligibility: '', languages: 'English', status: 'available' };
    return `<div class="scrim" data-act="close-dialog"><form class="dialog" id="res-form" role="dialog" aria-modal="true" aria-labelledby="res-title">
      <h2 id="res-title">${d.id ? 'Edit resource' : 'Add a resource'}</h2>
      <div class="form-grid">
        <div class="field full"><label for="r-name">Program name</label><input id="r-name" type="text" value="${h(r.name)}"></div>
        <div class="field"><label for="r-cat">Category</label><select id="r-cat">${CATS.map(([k, n]) => `<option value="${k}" ${r.cat === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="r-phone">Phone</label><input id="r-phone" type="text" value="${h(r.phone)}"></div>
        <div class="field full"><label for="r-desc">What it is</label><textarea id="r-desc">${h(r.desc)}</textarea></div>
        <div class="field full"><label for="r-addr">Where</label><input id="r-addr" type="text" value="${h(r.address)}"></div>
        <div class="field full"><label for="r-hours">Hours</label><input id="r-hours" type="text" value="${h(r.hours)}"></div>
        <div class="field full"><label for="r-elig">Who can get it</label><input id="r-elig" type="text" value="${h(r.eligibility)}"></div>
        <div class="field full"><label for="r-lang">Languages</label><input id="r-lang" type="text" value="${h(r.languages)}"></div>
      </div>
      <p class="err" id="r-err" role="alert" hidden></p>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-act="close-dialog">Cancel</button><button class="btn primary" type="submit">Save</button></div></form></div>`;
  }
  if (d.type === 'copy') {
    return `<div class="scrim" data-act="close-dialog"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="cp-title">
      <h2 id="cp-title">Copy this data</h2><p class="small muted">Your browser blocked automatic copying. The text below is selected: press Ctrl+C (or ⌘C on a Mac), then paste into Excel or Google Sheets.</p>
      <textarea id="cp-text" readonly style="min-height:200px;font-family:ui-monospace,monospace;font-size:0.8rem">${h(d.text)}</textarea>
      <div class="dialog-actions"><button class="btn primary" data-act="close-dialog">Done</button></div></div></div>`;
  }
  if (d.type === 'revoke') {
    return `<div class="scrim" data-act="close-dialog"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="rv-title">
      <h2 id="rv-title">Withdraw consent?</h2><p>All partner organizations and outside contacts will lose access to this record right away. Notes they already added stay in the record.</p>
      <div class="dialog-actions"><button class="btn ghost" data-act="close-dialog">Keep sharing</button><button class="btn primary" data-act="revoke-confirm">Withdraw consent</button></div></div></div>`;
  }
  return '';
}

/* ---------- render ---------- */
const app = document.getElementById('app');
// preserve: keep what people have typed when shared data changes underneath them.
function render(opts = {}) {
  const kept = {};
  if (opts.preserve) app.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => { kept[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
  const main = { home: homeView, login: loginView, staff: staffView, public: publicView }[S.view]();
  const focusId = document.activeElement?.id;
  const pos = document.activeElement?.selectionStart;
  const y = window.scrollY;
  app.innerHTML = topbar() + main + dialogHTML() + presentHTML();
  tipEl.hidden = true;
  if (opts.preserve) {
    Object.entries(kept).forEach(([id, v]) => { const el = document.getElementById(id); if (!el) return; if (el.type === 'checkbox') el.checked = v; else el.value = v; });
    window.scrollTo(0, y);
  }
  if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus({ preventScroll: true }); try { if (pos != null) el.setSelectionRange(pos, pos); } catch {} } }
}
const go = (patch) => { Object.assign(S, patch); render(); if (!patch.keepScroll) window.scrollTo(0, 0); };

function login(orgId, email) {
  S.session = { org: orgId, name: STAFF[orgId], email: email || org(orgId).email };
  go({ view: 'staff', tab: 'clients', q: '', filter: 'all', loginErr: '' });
  toast(`Signed in to ${org(orgId).name}`);
}

/* ---------- events ---------- */
app.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'close-dialog') { if (e.target !== t) return; S.dialog = null; render(); return; }
  if (t.tagName === 'INPUT' || t.tagName === 'SELECT') return; // handled on change
  const c = () => db.clients.find(x => x.id === S.clientId);
  switch (act) {
    case 'home': go({ view: S.session ? 'staff' : 'home', tab: 'clients' }); break;
    case 'go-login': go({ view: 'login', loginErr: '' }); break;
    case 'go-public': go({ view: 'public' }); break;
    case 'logout': S.session = null; go({ view: 'home' }); toast('Signed out'); break;
    case 'demo-login': login(t.dataset.org); break;
    case 'reset': if (mode !== 'local') break; src = toSources(fresh()); saveLocal(); rebuild(); render(); toast('Demo data reset'); break;
    case 'tab': go({ tab: t.dataset.tab }); break;
    case 'open-client': go({ tab: 'client', clientId: t.dataset.id }); break;
    case 'consent': { const cl = c(); cl.consent = { given: true, date: TODAY, by: S.session.name }; commit(saveClient(cl), 'Consent recorded. You can now share this record.', `recorded sharing consent for ${cl.first} ${cl.last}`); go({ keepScroll: true }); break; }
    case 'revoke': S.dialog = { type: 'revoke' }; render(); break;
    case 'revoke-confirm': { const cl = c(); cl.consent = { given: false }; cl.sharedWith = []; cl.external = []; S.dialog = null; commit(saveClient(cl), 'Consent withdrawn. Record is private again.', `withdrew consent and stopped all sharing for ${cl.first} ${cl.last}`); go({ keepScroll: true }); break; }
    case 'remove-ext': { const cl = c(); cl.external = cl.external.filter(x => x !== t.dataset.email); commit(saveClient(cl), 'Access removed', `stopped sharing ${cl.first} ${cl.last} with ${t.dataset.email}`); go({ keepScroll: true }); break; }
    case 'edit-res': S.dialog = { type: 'res', id: t.dataset.id }; render(); break;
    case 'req-done': { const q = db.requests.find(x => x.id === t.dataset.id); commit(saveRequest({ ...q, status: 'done' }), 'Marked as contacted'); go({ keepScroll: true }); break; }
    case 'r-scope': go({ rScope: t.dataset.v, keepScroll: true }); break;
    case 'r-range': go({ rRange: Number(t.dataset.v), keepScroll: true }); break;
    case 'toggle-table': { const id = t.dataset.id; S.tables.has(id) ? S.tables.delete(id) : S.tables.add(id); go({ keepScroll: true }); break; }
    case 'copy-sheet': {
      const rows = SHEETS[t.dataset.id]; if (!rows) break;
      const text = toTSV(rows);
      const fallback = () => { S.dialog = { type: 'copy', text }; render(); const ta = document.getElementById('cp-text'); ta?.focus(); ta?.select(); };
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(`Copied ${rows.length - 1} rows. Paste into Excel or Google Sheets.`), fallback);
      else fallback();
      break;
    }
    case 'present': S.present = 0; render(); try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch {} break;
    case 'slide-next': S.present++; render(); break;
    case 'slide-prev': S.present = Math.max(0, S.present - 1); render(); break;
    case 'slide-exit': S.present = null; try { document.fullscreenElement && document.exitFullscreen(); } catch {} render(); break;
    case 'pub-cat': go({ pubCat: t.dataset.cat || null, keepScroll: true }); break;
    case 'ask-help': S.dialog = { type: 'ask', id: t.dataset.id }; render(); break;
    case 'copy': {
      const txt = t.dataset.text;
      navigator.clipboard?.writeText(txt).then(() => toast('Phone number copied'), () => toast(txt));
      if (!navigator.clipboard) toast(txt);
      break;
    }
  }
});
app.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('tr[data-act="open-client"]')) e.target.click();
  if (e.key === 'Escape' && S.dialog) { S.dialog = null; render(); }
});

app.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.act === 'toggle-share') {
    const cl = db.clients.find(x => x.id === S.clientId);
    const o = org(t.dataset.org);
    if (t.checked) { cl.sharedWith.push(o.id); commit(saveClient(cl), `Shared with ${o.name}`, `shared ${cl.first} ${cl.last} with ${o.name}`); }
    else { cl.sharedWith = cl.sharedWith.filter(x => x !== o.id); commit(saveClient(cl), `${o.name} no longer has access`, `stopped sharing ${cl.first} ${cl.last} with ${o.name}`); }
    go({ keepScroll: true });
  }
  if (t.dataset.act === 'set-status') { const r = db.resources.find(x => x.id === t.dataset.id); commit(saveResource({ ...r, status: t.value }), 'Availability updated for the public'); go({ keepScroll: true }); }
  if (t.id === 'c-filter') go({ filter: t.value, keepScroll: true });
  if (t.id === 'r-pivot') go({ pivot: t.value, keepScroll: true });
  if (t.id === 'r-suppress') go({ suppress: t.checked, keepScroll: true });
  if (t.id === 'p-open') go({ openNow: t.checked, keepScroll: true });
});
app.addEventListener('input', e => {
  if (e.target.id === 'c-search') { S.q = e.target.value; render(); }
  if (e.target.id === 'p-search') { S.pubQ = e.target.value; render(); }
});

app.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = id => (document.getElementById(id)?.value || '').trim();
  if (f.id === 'login-form') {
    const o = v('l-org'), em = v('l-email');
    if (!o) { S.loginErr = 'Choose your organization.'; render(); return; }
    if (!em || !em.includes('@')) { S.loginErr = 'Enter your work email.'; render(); return; }
    if (!v('l-pass')) { S.loginErr = 'Enter your password.'; render(); return; }
    login(o, em);
  }
  if (f.id === 'note-form') {
    const txt = v('n-text'); if (!txt) return;
    const cl = db.clients.find(x => x.id === S.clientId);
    commit(addNote(cl, { org: me(), author: S.session.name, date: TODAY, text: txt }), 'Note added', `added a note to ${cl.first} ${cl.last}`);
    go({ keepScroll: true });
  }
  if (f.id === 'ext-form') {
    const em = v('ext-email');
    if (!em.includes('@')) { toast('Enter a full email address'); return; }
    const cl = db.clients.find(x => x.id === S.clientId);
    if (!cl.external.includes(em)) cl.external.push(em);
    commit(saveClient(cl), `Shared with ${em}`, `shared ${cl.first} ${cl.last} with ${em} (outside the network)`); go({ keepScroll: true });
  }
  if (f.id === 'add-form') {
    const err = document.getElementById('add-err');
    if (!v('a-first') || !v('a-last')) { err.textContent = 'Enter the client\'s first and last name.'; err.hidden = false; return; }
    const consent = document.getElementById('a-consent').checked;
    const shares = [...f.querySelectorAll('input[name=share]:checked')].map(x => x.value);
    if (shares.length && !consent) { err.textContent = 'To share with partners, first confirm the client agreed.'; err.hidden = false; return; }
    const cl = { id: uid('c'), first: v('a-first'), last: v('a-last'), dob: v('a-dob') || '1990-01-01', phone: v('a-phone') || 'Not given',
      household: parseInt(v('a-house')) || 1, language: v('a-lang') || 'English', owner: me(),
      consent: consent ? { given: true, date: TODAY, by: S.session.name } : { given: false }, sharedWith: shares, external: [], intake: TODAY,
      needs: [...f.querySelectorAll('input[name=need]:checked')].map(x => x.value),
      notes: v('a-note') ? [{ org: me(), author: S.session.name, date: TODAY, text: v('a-note') }] : [] };
    commit(saveClient(cl), 'Client saved', `added ${cl.first} ${cl.last}${shares.length ? ' and shared with ' + shares.map(s => org(s).name).join(', ') : ''}`)
      .then(() => { if (db.clients.some(x => x.id === cl.id)) go({ tab: 'client', clientId: cl.id }); });
  }
  if (f.id === 'ask-form') {
    if (!v('q-contact')) { const er = document.getElementById('q-err'); er.textContent = 'Add a phone number or email so they can reach you.'; er.hidden = false; return; }
    const r = db.resources.find(x => x.id === S.dialog.id);
    const q = { id: uid('q'), resource: r.id, org: r.org, name: v('q-name') || 'Anonymous', contact: v('q-contact'), message: v('q-msg') || '(no message)', date: TODAY, status: 'new' };
    S.dialog = null; commit(saveRequest(q), `Request sent to ${org(r.org).name}`); render();
  }
  if (f.id === 'res-form') {
    if (!v('r-name')) { const er = document.getElementById('r-err'); er.textContent = 'Give the program a name.'; er.hidden = false; return; }
    const r = { ...(db.resources.find(x => x.id === S.dialog.id) || { id: uid('r'), org: me(), status: 'available', days: [1, 2, 3, 4, 5], open: [9, 17], order: db.resources.length }),
      name: v('r-name'), cat: v('r-cat'), phone: v('r-phone'), desc: v('r-desc'), address: v('r-addr'), hours: v('r-hours'), eligibility: v('r-elig'), languages: v('r-lang') };
    S.dialog = null; commit(saveResource(r), 'Resource saved. It now shows in the public finder.'); render();
  }
});

render();
connect();
})();
