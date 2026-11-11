/* ============================================================================
   HUFF & PUFF BURGER — Complaint Management System
   script.js — application logic (vanilla JavaScript, no frameworks)
   ----------------------------------------------------------------------------
   Contents
     1. Utilities
     2. Icons (inline SVG)
     3. Constants & state
     4. Settings (localStorage)
     5. Data layer — Google Apps Script API (live) / localStorage (demo)
     6. Business helpers (status rules, KPIs, filtering)
     7. UI primitives (toast, confirm, modal, print)
     8. Shell & router
     9. Dashboard
    10. Register / edit complaint
    11. All complaints table
    12. Complaint detail modal
    13. Follow-ups
    14. Branch management
    15. Daily report
    16. Weekly report
    17. Settings page
    18. CSV / backup / print documents
    19. Init & global events
   ============================================================================ */
'use strict';

/* ================= 1. UTILITIES ================= */

const $  = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function dStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function todayStr() { return dStr(new Date()); }
function nowLocalDT() {
  const d = new Date();
  return dStr(d) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function addDaysStr(dateStr, n) {
  const parts = String(dateStr).slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + n);
  return dStr(d);
}
function dayOf(dt) { return String(dt || '').slice(0, 10); }

/* "2026-10-31" -> "31 Oct 2026" ; keeps time if present */
function fmtD(s) {
  if (!s) return '—';
  const p = String(s).slice(0, 10).split('-');
  if (p.length !== 3) return esc(s);
  return (+p[2]) + ' ' + (MONTHS[+p[1] - 1] || '?') + ' ' + p[0];
}
function fmtDT(s) {
  if (!s) return '—';
  const t = String(s).length > 10 ? ', ' + String(s).slice(11, 16) : '';
  return fmtD(s) + t;
}
function timeAgo(dt) {
  if (!dt) return '';
  const diff = Date.now() - new Date(dt).getTime();
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  return d + 'd ago';
}
function debounce(fn, ms) {
  let t;
  return function () { clearTimeout(t); const args = arguments, self = this;
    t = setTimeout(() => fn.apply(self, args), ms); };
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 400);
}

/* localStorage helpers (used by demo mode + settings) */
function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full/blocked */ }
}
function lsDel(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }

/* ================= 2. ICONS (inline SVG) ================= */

const ICON_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  filePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 12v6M9 15h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1.5M14 7h1.5M9 11h1.5M14 11h1.5M9 15h1.5M14 15h1.5"/><path d="M10 21v-3h4v3"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chart: '<path d="M3 3v18h18"/><path d="M8 17v-6M13 17V7M18 17v-4"/>',
  gear: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  printer: '<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7" rx="1"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  edit: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
  alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  zap: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
  note: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 12v5"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
};
function icon(name) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + (ICON_PATHS[name] || '') + '</svg>';
}

/* ================= 3. CONSTANTS & STATE ================= */

const CFG = window.HPB_CONFIG || {};
const LS_KEYS = {
  COMPLAINTS: 'hpb_complaints_v1',
  BRANCHES: 'hpb_branches_v1',
  SETTINGS: 'hpb_settings_v1',
  URL: 'hpb_url_override_v1'
};
/* Sentinel stored in the URL override to force demo mode even if config.js
   still contains a URL. */
const DEMO_SENTINEL = '__DEMO__';

const OPEN_STATUSES = ['New', 'Assigned to Branch', 'Under Investigation', 'Waiting for Customer'];
const STATUS_COLORS = {
  'New': 'blue',
  'Assigned to Branch': 'purple',
  'Under Investigation': 'amber',
  'Waiting for Customer': 'teal',
  'Resolved': 'green',
  'Closed': 'grey'
};
const PRIORITY_COLORS = { 'Normal': 'grey', 'High': 'amber', 'Urgent': 'red' };
const HISTORY_TYPES = {
  created:   { label: 'Registered',   dot: 'blue' },
  status:    { label: 'Status change',dot: 'purple' },
  assigned:  { label: 'Assigned',     dot: 'orange' },
  followup:  { label: 'Follow-up',    dot: 'teal' },
  note:      { label: 'Note',         dot: 'grey' },
  resolved:  { label: 'Resolved',     dot: 'green' },
  edit:      { label: 'Edited',       dot: 'amber' },
  reopened:  { label: 'Reopened',     dot: 'red' }
};

const state = {
  mode: 'demo',                    // 'demo' | 'live'
  complaints: [],
  branches: [],
  settings: { userName: '', rowsPerPage: 10, followUpDays: 3, urlOverride: '' },
  sync: { busy: false, lastSync: null, error: null },
  page: 'dashboard',

  /* All-complaints table state */
  q: '',
  flt: { status: '', branch: '', category: '', priority: '', source: '', from: '', to: '' },
  sort: { key: 'dateTime', dir: 'desc' },
  pageNum: 1,

  editingId: null,
  currentDetailId: null,
  fupTab: 'today',
  charts: {}
};

/* ================= 4. SETTINGS ================= */

function loadSettings() {
  const saved = lsGet(LS_KEYS.SETTINGS, {});
  state.settings = Object.assign({ userName: '', rowsPerPage: 10, followUpDays: (CFG.DEFAULT_FOLLOWUP_DAYS || 3), urlOverride: '' }, saved);
  state.settings.urlOverride = lsGet(LS_KEYS.URL, '') || '';
}
function saveSettings() { lsSet(LS_KEYS.SETTINGS, state.settings); }

/* ---- Settings page lock ------------------------------------------------
   A light, client-side lock that asks for a password before the Settings
   page opens (protects the database URL and data tools from casual use).
   Honest limit: it deters everyday users but is NOT real security — the
   password lives in config.js and a technical person can bypass it.
   See README.md §6. ---------------------------------------------------- */

const LOCK_KEYS = { SESSION: 'hpb_settings_unlocked_v1', REMEMBER: 'hpb_settings_remember_v1' };

function settingsLockCfg() {
  const L = CFG.SETTINGS_LOCK || {};
  const password = String(L.PASSWORD || '');
  /* No password configured (or lock disabled) → the page opens freely. */
  return { enabled: L.ENABLED !== false && password !== '', password: password };
}

function settingsUnlocked() {
  try {
    if (localStorage.getItem(LOCK_KEYS.REMEMBER) === '1') return true;      /* remembered on this device */
    return sessionStorage.getItem(LOCK_KEYS.SESSION) === '1';               /* unlocked in this tab session */
  } catch (e) { return false; }                                             /* storage blocked → treat as locked */
}

function lockSettingsNow() {
  try {
    sessionStorage.removeItem(LOCK_KEYS.SESSION);
    localStorage.removeItem(LOCK_KEYS.REMEMBER);
  } catch (e) { /* ignore */ }
}

function showSettingsLock() {
  openModal(
    '<div class="modal-head"><h3>' + icon('lock') + ' Settings locked</h3></div>' +
    '<div class="modal-body">' +
      '<p class="muted small">Enter the administrator password to open Settings. ' +
      'The password is set in <code>config.js</code> (SETTINGS_LOCK).</p>' +
      '<div class="field">' +
        '<label for="lock-pass">Password</label>' +
        '<div class="lock-row">' +
          '<input id="lock-pass" class="inp" type="password" autocomplete="current-password" placeholder="Administrator password">' +
          '<button type="button" class="btn ghost" id="lock-eye" aria-label="Show or hide password">Show</button>' +
        '</div>' +
        '<p class="field-error" id="lock-err"></p>' +
      '</div>' +
      '<label class="check-row"><input type="checkbox" id="lock-remember"> Remember on this device</label>' +
    '</div>' +
    '<div class="modal-foot">' +
      '<button class="btn" id="lock-cancel">Cancel</button>' +
      '<button class="btn primary" id="lock-ok">Unlock</button>' +
    '</div>', { small: true });

  const inp = $('#lock-pass');
  const err = $('#lock-err');
  inp.focus();

  const tryUnlock = () => {
    const cfg = settingsLockCfg();
    if (inp.value === cfg.password) {
      try {
        sessionStorage.setItem(LOCK_KEYS.SESSION, '1');
        if ($('#lock-remember').checked) localStorage.setItem(LOCK_KEYS.REMEMBER, '1');
      } catch (e2) { /* storage blocked → stays unlocked for this attempt only */ }
      closeModal();
      toast('Settings unlocked', 'success');
      route('settings');
    } else {
      err.textContent = 'Wrong password. Try again.';
      const box = $('.modal', $('#modal-root'));
      box.classList.remove('shake');
      void box.offsetWidth;                    /* restart the animation */
      box.classList.add('shake');
      inp.select();
    }
  };

  $('#lock-ok').addEventListener('click', tryUnlock);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  $('#lock-eye').addEventListener('click', () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    $('#lock-eye').textContent = show ? 'Hide' : 'Show';
  });
  $('#lock-cancel').addEventListener('click', closeModal);
}

function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'HP';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

/* ================= 4b. SITE LOGIN (whole-website sign-in) =================
   When config.js LOGIN.ENABLED is true, nothing of the app is visible until
   the correct password is entered. Honest note: client-side only — the
   password lives in config.js and a technical person can bypass it.
   See README.md §6. ---------------------------------------------------- */

const LOGIN_KEYS = { SESSION: 'hpb_login_session_v1', REMEMBER: 'hpb_login_remember_v1' };
let appBooted = false;

function loginCfg() {
  const L = CFG.LOGIN || {};
  const password = String(L.PASSWORD || '');
  return {
    enabled: L.ENABLED === true && password !== '',
    password: password,
    rememberAllowed: L.REMEMBER_DEVICE !== false
  };
}

function loginUnlocked() {
  try {
    if (localStorage.getItem(LOGIN_KEYS.REMEMBER) === '1') return true;   /* remembered device */
    return sessionStorage.getItem(LOGIN_KEYS.SESSION) === '1';            /* this tab session */
  } catch (e) { return false; }                                           /* storage blocked */
}

function lockSiteNow() {
  try {
    sessionStorage.removeItem(LOGIN_KEYS.SESSION);
    localStorage.removeItem(LOGIN_KEYS.REMEMBER);
  } catch (e) { /* ignore */ }
}

function hideLoginScreen() {
  $('#login-screen').classList.add('hidden');
  document.body.classList.remove('login-open');
}

function showLoginScreen() {
  const cfg = loginCfg();
  document.body.classList.add('login-open');          /* CSS hides the app behind it */
  $('#login-screen').classList.remove('hidden');
  $('#login-version').textContent = 'v' + (CFG.VERSION || '');
  $('#login-remember-row').classList.toggle('hidden', !cfg.rememberAllowed);

  const inp = $('#login-pass');
  const err = $('#login-err');
  err.textContent = '';
  inp.value = '';
  inp.type = 'password';
  $('#login-eye').textContent = 'Show';
  $('#login-remember').checked = false;
  setTimeout(() => inp.focus(), 50);

  const trySignIn = () => {
    if (inp.value === cfg.password) {
      try {
        sessionStorage.setItem(LOGIN_KEYS.SESSION, '1');
        if ($('#login-remember').checked) localStorage.setItem(LOGIN_KEYS.REMEMBER, '1');
      } catch (e2) { /* storage blocked → stays signed in for this visit only */ }
      hideLoginScreen();
      toast('Signed in. Welcome back!', 'success');
      if (!appBooted) { appBooted = true; init(); }   /* boot the app only once */
    } else {
      err.textContent = 'Wrong password. Try again.';
      const card = $('#login-card');
      card.classList.remove('shake');
      void card.offsetWidth;                          /* restart the animation */
      card.classList.add('shake');
      inp.select();
    }
  };

  /* onclick (not addEventListener) so re-showing the screen never double-binds */
  $('#login-go').onclick = trySignIn;
  $('#login-eye').onclick = () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    $('#login-eye').textContent = show ? 'Hide' : 'Show';
  };
  inp.onkeydown = e => { if (e.key === 'Enter') trySignIn(); };
}

function onLogout() {
  closeModal();          /* close any open dialog first */
  lockSiteNow();         /* forget session + "keep me signed in" */
  showLoginScreen();
}

/* ================= 5. DATA LAYER ================= */

function getApiUrl() {
  const override = state.settings.urlOverride;
  if (override === DEMO_SENTINEL) return '';
  return String(override || CFG.APPS_SCRIPT_URL || '').trim();
}

function fetchTimeout(url, opts, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms || 20000);
  return fetch(url, Object.assign({}, opts, { signal: controller.signal }))
    .finally(() => clearTimeout(timer));
}

function parseApiResponse(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (e) {
    throw new Error('Unexpected response from the Web App. Check that the URL ends with /exec and the deployment access is set to "Anyone".');
  }
  if (data && data.ok === false) throw new Error(data.error || 'Unknown Apps Script error');
  if (!data || data.ok !== true) throw new Error('Invalid API response');
  return data;
}

async function apiGet(action, params) {
  const url = new URL(getApiUrl());
  url.searchParams.set('action', action);
  if (params) Object.keys(params).forEach(k => { if (params[k]) url.searchParams.set(k, params[k]); });
  let resp;
  try { resp = await fetchTimeout(url.toString()); }
  catch (e) { throw new Error('Could not reach the Google Apps Script Web App (network error or timeout).'); }
  const text = await resp.text();
  if (!resp.ok && !text) throw new Error('HTTP error ' + resp.status + ' from Web App');
  return parseApiResponse(text);
}

async function apiPost(payload) {
  /* Body is sent as plain text so the browser issues a "simple" CORS request
     (Google Apps Script endpoints do not answer CORS preflights). */
  let resp;
  try { resp = await fetchTimeout(getApiUrl(), { method: 'POST', body: JSON.stringify(payload) }); }
  catch (e) { throw new Error('Could not reach the Google Apps Script Web App (network error or timeout).'); }
  const text = await resp.text();
  if (!resp.ok && !text) throw new Error('HTTP error ' + resp.status + ' from Web App');
  return parseApiResponse(text);
}

function persistComplaints() { if (state.mode === 'demo') lsSet(LS_KEYS.COMPLAINTS, state.complaints); }
function persistBranches()   { if (state.mode === 'demo') lsSet(LS_KEYS.BRANCHES, state.branches); }

function normalizeBranch(b) {
  return {
    name: String(b.name || '').trim(),
    contact: String(b.contact || ''),
    phone: String(b.phone || ''),
    active: b.active === true || b.active === 'Yes' || b.active === 'true' || b.active === ''
  };
}
function normalizeComplaint(c) {
  const out = {};
  [
    'id', 'dateTime', 'source', 'branch', 'orderNumber', 'orderDateTime', 'category',
    'priority', 'description', 'deliveryPlatform', 'customerName', 'customerPhone',
    'reviewUrl', 'reportedBy', 'callbackRequired', 'branchContact', 'followUpDate',
    'status', 'resolution', 'resolvedAt', 'createdAt', 'updatedAt'
  ].forEach(k => { out[k] = c[k] === null || c[k] === undefined ? '' : String(c[k]); });
  let hist = c.history;
  if (typeof hist === 'string') { try { hist = JSON.parse(hist); } catch (e) { hist = []; } }
  out.history = Array.isArray(hist) ? hist : [];
  if (!out.status) out.status = 'New';
  return out;
}

function loadDemoData(force) {
  let complaints = lsGet(LS_KEYS.COMPLAINTS, null);
  if (complaints === null || (force && confirmNotNeeded)) { /* seeded below */ }
  if (complaints === null) {
    const demo = window.HPB_DEMO_DATA;
    complaints = demo && demo.complaints ? demo.complaints.map(normalizeComplaint) : [];
    lsSet(LS_KEYS.COMPLAINTS, complaints);
  }
  state.complaints = complaints;

  let branches = lsGet(LS_KEYS.BRANCHES, null);
  if (branches === null) {
    branches = (CFG.BRANCHES || []).slice();
    lsSet(LS_KEYS.BRANCHES, branches);
  }
  state.branches = branches.map(normalizeBranch);
}
let confirmNotNeeded = false; /* placeholder to keep loadDemoData(force) simple */

function seedDemoDataset() {
  const demo = window.HPB_DEMO_DATA;
  const complaints = demo && demo.complaints ? demo.complaints.map(normalizeComplaint) : [];
  lsSet(LS_KEYS.COMPLAINTS, complaints);
  state.complaints = complaints;
}

function upsertLocalComplaint(c) {
  const norm = normalizeComplaint(c);
  const i = state.complaints.findIndex(x => x.id === norm.id);
  if (i >= 0) state.complaints[i] = norm; else state.complaints.push(norm);
  return norm;
}

function nextComplaintId() {
  let max = 0;
  state.complaints.forEach(c => {
    const m = /^HPB-(\d+)$/.exec(String(c.id || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'HPB-' + String(max + 1).padStart(5, '0');
}

const Store = {

  async loadAll() {
    const url = getApiUrl();
    if (url) {
      state.mode = 'live';
      const [cRes, bRes] = await Promise.all([apiGet('getComplaints'), apiGet('getBranches')]);
      state.complaints = (cRes.complaints || []).map(normalizeComplaint);
      state.branches = (bRes.branches || []).map(normalizeBranch);
      /* First connection: seed the default branches on the server if empty. */
      if (!state.branches.length && (CFG.BRANCHES || []).length) {
        state.branches = CFG.BRANCHES.slice();
        try { await apiPost({ action: 'saveBranches', branches: state.branches }); } catch (e) { /* non-fatal */ }
      }
      state.sync.lastSync = nowLocalDT();
    } else {
      if (CFG.ALLOW_DEMO_MODE === false) throw new Error('No database URL configured.');
      state.mode = 'demo';
      loadDemoData();
      state.sync.lastSync = nowLocalDT();
    }
  },

  async reload() { return Store.loadAll(); },

  async createComplaint(values) {
    const now = nowLocalDT();
    const base = {
      id: '', status: 'New', resolution: '', resolvedAt: '',
      createdAt: now, updatedAt: now,
      history: [{ ts: now, type: 'created', detail: 'Complaint registered', by: state.settings.userName || 'Coordinator' }]
    };
    const complaint = Object.assign(base, values);
    if (state.mode === 'live') {
      const res = await apiPost({ action: 'createComplaint', complaint });
      return upsertLocalComplaint(res.complaint);
    }
    complaint.id = nextComplaintId();          // demo mode: local ID
    complaint.history[0].detail = 'Complaint registered (' + complaint.id + ')';
    state.complaints.push(normalizeComplaint(complaint));
    persistComplaints();
    return state.complaints[state.complaints.length - 1];
  },

  async updateComplaint(id, patch, historyEntry) {
    if (state.mode === 'live') {
      const res = await apiPost({ action: 'updateComplaint', id, patch, historyEntry: historyEntry || null });
      return upsertLocalComplaint(res.complaint);
    }
    const c = state.complaints.find(x => x.id === id);
    if (!c) throw new Error('Complaint not found: ' + id);
    Object.keys(patch || {}).forEach(k => { c[k] = patch[k]; });
    if (historyEntry) {
      c.history = c.history || [];
      c.history.push(Object.assign({ ts: nowLocalDT(), by: state.settings.userName || 'Coordinator' }, historyEntry));
    }
    c.updatedAt = nowLocalDT();
    persistComplaints();
    return c;
  },

  async deleteComplaint(id) {
    if (state.mode === 'live') {
      await apiPost({ action: 'deleteComplaint', id });
      state.complaints = state.complaints.filter(c => c.id !== id);
      return;
    }
    state.complaints = state.complaints.filter(c => c.id !== id);
    persistComplaints();
  },

  async saveBranches(list) {
    const clean = list.map(normalizeBranch);
    if (state.mode === 'live') {
      const res = await apiPost({ action: 'saveBranches', branches: clean });
      state.branches = (res.branches || clean).map(normalizeBranch);
    } else {
      state.branches = clean;
      persistBranches();
    }
  },

  /* Rename cascades: updates branch field on every complaint record. */
  async renameBranch(from, to) {
    if (state.mode === 'live') {
      await apiPost({ action: 'renameBranch', from, to });
      state.complaints.forEach(c => { if (c.branch === from) c.branch = to; });
    } else {
      state.complaints.forEach(c => { if (c.branch === from) c.branch = to; });
      persistComplaints();
    }
  }
};

/* ================= 6. BUSINESS HELPERS ================= */

function isOpen(c) { return OPEN_STATUSES.indexOf(c.status) >= 0; }
function isResolvedLike(c) { return c.status === 'Resolved' || c.status === 'Closed'; }
function isOverdue(c, ref) { return isOpen(c) && !!c.followUpDate && c.followUpDate < (ref || todayStr()); }

function computeKPIs(list, ref) {
  ref = ref || todayStr();
  const durations = [];
  let open = 0, resolved = 0, urgent = 0, overdue = 0, waitingBranch = 0, today = 0;
  list.forEach(c => {
    if (dayOf(c.dateTime) === ref) today++;
    const openC = isOpen(c);
    if (openC) open++;
    if (isResolvedLike(c)) resolved++;
    if (c.priority === 'Urgent' && openC) urgent++;
    if (isOverdue(c, ref)) overdue++;
    if (c.status === 'Assigned to Branch') waitingBranch++;
    if (c.resolvedAt) {
      const days = (new Date(c.resolvedAt) - new Date(c.dateTime)) / 86400000;
      if (!isNaN(days)) durations.push(Math.max(0, days));
    }
  });
  const avgDays = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  return {
    total: list.length, today, open, resolved, urgent, overdue, waitingBranch,
    avgDays: avgDays === null ? null : Math.round(avgDays * 10) / 10
  };
}

function countBy(list, fn) {
  const m = new Map();
  list.forEach(x => { const k = fn(x) || '—'; m.set(k, (m.get(k) || 0) + 1); });
  return Array.from(m.entries()).map(e => ({ key: e[0], count: e[1] })).sort((a, b) => b.count - a.count);
}

function lastNDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ date: dStr(d), label: MONTHS[d.getMonth()] + ' ' + d.getDate() });
  }
  return out;
}

function weekRange(ref) {
  const d = ref ? new Date(ref + 'T12:00') : new Date();
  const dow = (d.getDay() + 6) % 7;               // 0 = Monday
  const mon = new Date(d); mon.setDate(d.getDate() - dow);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return [dStr(mon), dStr(sun)];
}

function getFilteredComplaints() {
  const q = state.q.trim().toLowerCase();
  const f = state.flt;
  const rows = state.complaints.filter(c => {
    if (f.status && c.status !== f.status) return false;
    if (f.branch && c.branch !== f.branch) return false;
    if (f.category && c.category !== f.category) return false;
    if (f.priority && c.priority !== f.priority) return false;
    if (f.source && c.source !== f.source) return false;
    const d = dayOf(c.dateTime);
    if (f.from && d < f.from) return false;
    if (f.to && d > f.to) return false;
    if (q) {
      const hay = [c.id, c.customerName, c.customerPhone, c.orderNumber, c.description, c.branch, c.category, c.source]
        .join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });

  const PRIORITY_RANK = { 'Normal': 0, 'High': 1, 'Urgent': 2 };
  const key = state.sort.key, dir = state.sort.dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    let va, vb;
    if (key === 'priority') { va = PRIORITY_RANK[a.priority] || 0; vb = PRIORITY_RANK[b.priority] || 0; return (va - vb) * dir; }
    if (key === 'status') { va = CFG.STATUSES.indexOf(a.status); vb = CFG.STATUSES.indexOf(b.status); return (va - vb) * dir; }
    va = String(a[key] === undefined || a[key] === null ? '' : a[key]).toLowerCase();
    vb = String(b[key] === undefined || b[key] === null ? '' : b[key]).toLowerCase();
    return va < vb ? -dir : va > vb ? dir : 0;
  });
  return rows;
}

/* Human-readable summary of what changed during an edit. */
const EDITABLE_LABELS = {
  dateTime: 'Date & time', source: 'Source', branch: 'Branch', orderNumber: 'Order number',
  orderDateTime: 'Order date/time', category: 'Category', priority: 'Priority',
  description: 'Description', deliveryPlatform: 'Delivery platform', customerName: 'Customer name',
  customerPhone: 'Customer phone', reviewUrl: 'Review URL', reportedBy: 'Reported by',
  callbackRequired: 'Callback required', branchContact: 'Branch contact', followUpDate: 'Follow-up date'
};
function changeSummary(oldC, newVals) {
  const changes = [];
  Object.keys(EDITABLE_LABELS).forEach(k => {
    const a = String(oldC[k] === undefined || oldC[k] === null ? '' : oldC[k]);
    const b = String(newVals[k] === undefined || newVals[k] === null ? '' : newVals[k]);
    if (a !== b) changes.push(EDITABLE_LABELS[k] + ': ' + (a ? a.slice(0, 60) : '(empty)') + ' → ' + (b ? b.slice(0, 60) : '(empty)'));
  });
  const s = changes.join('; ');
  return s.length > 280 ? s.slice(0, 280) + '…' : (s || 'No field changes');
}

/* ================= 7. UI PRIMITIVES ================= */

function toast(msg, type) {
  const root = $('#toast-root');
  const t = document.createElement('div');
  t.className = 'toast ' + (type || 'success');
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 4200);
}

/* Promise-based confirm dialog; opts.typed requires typing a word (e.g. DELETE). */
function confirmDialog(opts) {
  return new Promise(resolve => {
    const root = $('#confirm-root');
    const typed = opts.typed || null;
    root.innerHTML =
      '<div class="modal-overlay" data-overlay="1"><div class="modal small">' +
        '<div class="modal-head"><h3>' + esc(opts.title || 'Are you sure?') + '</h3></div>' +
        '<div class="modal-body">' +
          (opts.message ? '<p style="margin-bottom:10px">' + esc(opts.message) + '</p>' : '') +
          (typed ? '<p class="muted small">Type <strong>' + esc(typed) + '</strong> to confirm:</p>' +
                   '<input class="inp" id="confirm-typed" autocomplete="off" spellcheck="false">' : '') +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn" id="confirm-cancel">Cancel</button>' +
          '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" id="confirm-ok"' + (typed ? ' disabled' : '') + '>' +
            esc(opts.confirmLabel || 'Confirm') + '</button>' +
        '</div>' +
      '</div></div>';
    const done = v => { root.innerHTML = ''; resolve(v); };
    $('#confirm-cancel').addEventListener('click', () => done(false));
    $('#confirm-ok').addEventListener('click', () => done(true));
    $('.modal-overlay', root).addEventListener('click', e => { if (e.target.dataset.overlay) done(false); });
    if (typed) {
      const inp = $('#confirm-typed');
      inp.focus();
      inp.addEventListener('input', () => { $('#confirm-ok').disabled = inp.value.trim() !== typed; });
    }
  });
}

function openModal(innerHtml, opts) {
  opts = opts || {};
  const root = $('#modal-root');
  root.innerHTML =
    '<div class="modal-overlay" data-overlay="1"><div class="modal ' + (opts.small ? 'small' : '') + '">' +
      innerHtml +
    '</div></div>';
  document.body.classList.add('no-scroll');
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  state.currentDetailId = null;
  document.body.classList.remove('no-scroll');
}

function chip(text, color) { return '<span class="chip chip-' + color + '">' + esc(text) + '</span>'; }
function statusChip(s) { return chip(s, STATUS_COLORS[s] || 'grey'); }
function priorityChip(p) { return chip(p, PRIORITY_COLORS[p] || 'grey'); }

/* Print any prepared HTML document (isolated from the app UI). */
function printHTML(title, inner) {
  $('#print-area').innerHTML =
    '<div class="print-doc">' +
      '<div class="print-head">' +
        '<div class="print-brand">HUFF &amp; PUFF BURGER</div>' +
        '<div class="print-title">' + esc(title) + '</div>' +
        '<div class="print-meta">Generated ' + esc(fmtDT(nowLocalDT())) + ' · Complaint Management System</div>' +
      '</div>' + inner +
    '</div>';
  window.print();
}

/* ================= 8. SHELL & ROUTER ================= */

const PAGES = {
  dashboard:  { title: 'Dashboard',           render: renderDashboard },
  register:   { title: 'Register Complaint',  render: renderRegisterPage },
  complaints: { title: 'All Complaints',      render: renderComplaintsPage },
  followups:  { title: 'Follow-ups',          render: renderFollowups },
  branches:   { title: 'Branch Management',   render: renderBranches },
  daily:      { title: 'Daily Report',        render: renderDaily },
  weekly:     { title: 'Weekly Report',       render: renderWeekly },
  settings:   { title: 'Settings',            render: renderSettings }
};

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',          icon: 'grid' },
  { id: 'register',   label: 'Register Complaint', icon: 'filePlus' },
  { id: 'complaints', label: 'All Complaints',     icon: 'list' },
  { id: 'followups',  label: 'Follow-ups',         icon: 'bell' },
  { id: 'branches',   label: 'Branch Management',  icon: 'building' },
  { id: 'daily',      label: 'Daily Reports',      icon: 'calendar' },
  { id: 'weekly',     label: 'Weekly Reports',     icon: 'chart' },
  { id: 'settings',   label: 'Settings',           icon: 'gear' }
];

function buildNav() {
  $('#nav').innerHTML =
    '<div class="nav-section">Operations</div>' +
    NAV_ITEMS.slice(0, 5).map(it =>
      '<a href="#" class="nav-link" data-nav="' + it.id + '">' + icon(it.icon) + '<span>' + it.label + '</span></a>'
    ).join('') +
    '<div class="nav-section">Reports</div>' +
    NAV_ITEMS.slice(5, 7).map(it =>
      '<a href="#" class="nav-link" data-nav="' + it.id + '">' + icon(it.icon) + '<span>' + it.label + '</span></a>'
    ).join('') +
    '<div class="nav-section">System</div>' +
    '<a href="#" class="nav-link" data-nav="settings">' + icon('gear') + '<span>Settings</span></a>';
}

function route(page) {
  if (!PAGES[page]) page = 'dashboard';
  /* Settings lock: every path into Settings (sidebar, banner links, buttons)
     goes through route(), so this single gate covers them all. */
  if (page === 'settings' && settingsLockCfg().enabled && !settingsUnlocked()) {
    showSettingsLock();
    return;
  }
  state.page = page;
  $$('.page').forEach(s => s.classList.add('hidden'));
  $('#page-' + page).classList.remove('hidden');
  $$('#nav .nav-link').forEach(a => a.classList.toggle('active', a.dataset.nav === page));
  $('#page-title').textContent = PAGES[page].title;
  closeSidebar();
  window.scrollTo(0, 0);
  PAGES[page].render();
}

function rerenderCurrent() { PAGES[state.page].render(); }

function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-overlay').classList.remove('show');
}

function setBusy(busy) {
  state.sync.busy = busy;
  const btn = $('#btn-refresh');
  btn.classList.toggle('spin', busy);
  btn.disabled = busy;
}

function updateHeader() {
  const pill = $('#mode-pill');
  if (state.mode === 'live') {
    pill.className = 'mode-pill live';
    pill.innerHTML = '<span class="dot"></span> LIVE · GOOGLE SHEETS';
    $('#sync-info').textContent = state.sync.lastSync ? 'Synced ' + fmtDT(state.sync.lastSync) : 'Live database';
  } else {
    pill.className = 'mode-pill demo';
    pill.innerHTML = '<span class="dot"></span> DEMO MODE';
    $('#sync-info').textContent = 'Saved in this browser only';
  }
  $('#demo-banner').classList.toggle('hidden', state.mode === 'live');
  $('#user-chip').textContent = initialsOf(state.settings.userName);

  const err = state.sync.error;
  const banner = $('#error-banner');
  if (err) {
    banner.innerHTML = '<span><strong>Connection problem:</strong> ' + esc(err) + '</span>' +
      '<button class="btn small" data-action="retry">Retry</button>' +
      '<button class="btn small ghost" data-nav="settings">Open Settings</button>';
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

/* ================= 9. DASHBOARD ================= */

function emptyState(title, sub, iconName) {
  return '<div class="empty">' + icon(iconName || 'inbox') +
    '<div class="empty-title">' + esc(title) + '</div>' +
    (sub ? '<div class="empty-sub">' + esc(sub) + '</div>' : '') +
    '</div>';
}

function listRow(c, extraRight) {
  return '<div class="list-row">' +
    '<div class="list-main">' +
      '<div class="list-title"><button class="link-btn" data-action="view" data-id="' + esc(c.id) + '">' + esc(c.id) + '</button>' +
        priorityChip(c.priority) + statusChip(c.status) + '</div>' +
      '<div class="list-sub">' + esc(c.branch) + ' · ' + esc(c.category) + ' · ' + esc(c.customerName) + '</div>' +
    '</div>' +
    '<div class="list-right muted small">' + (extraRight || esc(timeAgo(c.dateTime))) + '</div>' +
  '</div>';
}

function renderDashboard() {
  const list = state.complaints;
  const k = computeKPIs(list);

  /* KPI cards — every number computed from saved records */
  const kpis = [
    { label: 'Total complaints',    value: k.total,                sub: 'All records',                    ic: 'layers' },
    { label: 'Received today',      value: k.today,                sub: 'dated ' + fmtD(todayStr()),      ic: 'calendar' },
    { label: 'Open complaints',     value: k.open,                 sub: 'not yet resolved / closed',      ic: 'inbox' },
    { label: 'Resolved',            value: k.resolved,             sub: 'Resolved + Closed',              ic: 'checkCircle' },
    { label: 'Urgent (open)',       value: k.urgent,               sub: 'priority Urgent, still open',    ic: 'zap', alert: k.urgent > 0 },
    { label: 'Overdue',             value: k.overdue,              sub: 'follow-up date passed',          ic: 'clock', alert: k.overdue > 0 },
    { label: 'Waiting for branch',  value: k.waitingBranch,        sub: 'status "Assigned to Branch"',    ic: 'phone' },
    { label: 'Avg resolution time', value: k.avgDays === null ? '—' : k.avgDays + ' d', sub: 'received → resolved', ic: 'history' }
  ];
  $('#kpi-grid').innerHTML = kpis.map(x =>
    '<div class="kpi-card' + (x.alert ? ' alert' : '') + '">' +
      '<div class="kpi-icon">' + icon(x.ic) + '</div>' +
      '<div><div class="kpi-label">' + esc(x.label) + '</div>' +
      '<div class="kpi-value">' + esc(String(x.value)) + '</div>' +
      '<div class="kpi-sub">' + esc(x.sub) + '</div></div>' +
    '</div>'
  ).join('');

  /* Charts */
  const days = lastNDays(14);
  const byDay = days.map(d => list.filter(c => dayOf(c.dateTime) === d.date).length);
  const activeBranches = state.branches.filter(b => b.active);
  const byBranch = activeBranches
    .map(b => ({ name: b.name, count: list.filter(c => c.branch === b.name).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const byCat = CFG.CATEGORIES.map(cat => ({ name: cat, count: list.filter(c => c.category === cat).length }))
    .filter(x => x.count > 0);
  const bySrc = CFG.SOURCES.map(s => ({ name: s, count: list.filter(c => c.source === s).length }))
    .filter(x => x.count > 0);
  const byStatus = (CFG.STATUSES || []).map(s => ({ name: s, count: list.filter(c => c.status === s).length }))
    .filter(x => x.count > 0);

  if (typeof Chart === 'undefined') {
    $$('.chart-box canvas').forEach(cv => {
      if (cv.dataset.fallback) return;
      cv.dataset.fallback = '1';
      cv.style.display = 'none';
      cv.parentElement.insertAdjacentHTML('beforeend',
        '<div class="chart-fallback">Charts unavailable — Chart.js CDN could not be loaded.<br>All statistics and tables still work.</div>');
    });
  } else {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    const gridColor = '#ECECEE';

    makeChart('chart-days', {
      type: 'line',
      data: {
        labels: days.map(d => d.label),
        datasets: [{ label: 'Complaints', data: byDay, borderColor: '#F97316', backgroundColor: 'rgba(249,115,22,.12)', fill: true, tension: .3, pointRadius: 3, borderWidth: 2 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { color: gridColor } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor } } } }
    });

    makeChart('chart-branch', {
      type: 'bar',
      data: {
        labels: byBranch.map(b => b.name),
        datasets: [{ label: 'Complaints', data: byBranch.map(b => b.count), backgroundColor: '#F97316', borderRadius: 5, maxBarThickness: 22 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor } }, y: { grid: { display: false } } } }
    });

    makeChart('chart-category', {
      type: 'doughnut',
      data: { labels: byCat.map(x => x.name),
        datasets: [{ data: byCat.map(x => x.count), backgroundColor: CAT_COLORS(byCat.length), borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10.5 } } } } }
    });

    makeChart('chart-source', {
      type: 'bar',
      data: {
        labels: bySrc.map(x => x.name),
        datasets: [{ label: 'Complaints', data: bySrc.map(x => x.count), backgroundColor: '#18181B', borderRadius: 5, maxBarThickness: 34 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor } } } }
    });

    makeChart('chart-status', {
      type: 'doughnut',
      data: { labels: byStatus.map(x => x.name),
        datasets: [{ data: byStatus.map(x => x.count), backgroundColor: byStatus.map(x => STATUS_HEX[x.name] || '#9CA3AF'), borderWidth: 2, borderColor: '#fff' }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10.5 } } } } }
    });
  }

  /* Lists */
  const recent = list.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8);
  const urgent = list.filter(c => c.priority === 'Urgent' && isOpen(c))
    .sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
  const overdue = list.filter(c => isOverdue(c))
    .sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate)));
  const top = byBranch.slice(0, 5);
  const maxTop = top.length ? top[0].count : 0;

  $('#dash-recent').innerHTML = recent.length
    ? recent.map(c => listRow(c)).join('')
    : emptyState('No complaints yet', 'Register your first complaint to see it here.', 'filePlus');

  $('#count-urgent').textContent = urgent.length;
  $('#dash-urgent').innerHTML = urgent.length
    ? urgent.slice(0, 8).map(c => listRow(c, esc(fmtDT(c.dateTime)))).join('')
    : emptyState('No urgent complaints', 'Open complaints with Urgent priority appear here.', 'zap');

  $('#count-overdue').textContent = overdue.length;
  $('#dash-overdue').innerHTML = overdue.length
    ? overdue.slice(0, 8).map(c => listRow(c, 'Due ' + fmtD(c.followUpDate))).join('')
    : emptyState('Nothing overdue', 'All follow-ups are on schedule.', 'check');

  $('#dash-topbranches').innerHTML = top.length
    ? top.map(b =>
        '<div class="list-row"><div class="list-main"><div class="list-title">' + esc(b.name) + '</div>' +
        '<div class="mini-track"><div class="mini-bar" style="width:' + Math.round(100 * b.count / maxTop) + '%"></div></div></div>' +
        '<div class="list-right"><strong>' + b.count + '</strong></div></div>'
      ).join('')
    : emptyState('No data', 'Branch ranking appears once complaints exist.', 'building');
}

function makeChart(canvasId, cfg) {
  const cv = document.getElementById(canvasId);
  if (!cv) return;
  if (state.charts[canvasId]) { try { state.charts[canvasId].destroy(); } catch (e) { /* ignore */ } }
  state.charts[canvasId] = new Chart(cv, cfg);
}

/* Professional 10-color palette (orange-forward, muted rest) */
function CAT_COLORS(n) {
  const palette = ['#F97316', '#18181B', '#0D9488', '#2563EB', '#D97706', '#7C3AED', '#DC2626', '#6B7280', '#84CC16', '#0EA5E9'];
  return Array.from({ length: n }, (_, i) => palette[i % palette.length]);
}
const STATUS_HEX = {
  'New': '#2563EB', 'Assigned to Branch': '#7C3AED', 'Under Investigation': '#D97706',
  'Waiting for Customer': '#0D9488', 'Resolved': '#16A34A', 'Closed': '#9CA3AF'
};

/* ================= 10. REGISTER / EDIT COMPLAINT ================= */

function fillSelect(sel, values, selected, allLabel) {
  let html = allLabel !== undefined ? '<option value="">' + esc(allLabel) + '</option>' : '';
  values.forEach(v => {
    html += '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>';
  });
  sel.innerHTML = html;
}

function populateFormOptions() {
  const branches = state.branches.filter(b => b.active).map(b => b.name);
  fillSelect($('#f-source'), CFG.SOURCES || [], 'Call Centre');
  fillSelect($('#f-branch'), branches, '', '— Select branch —');
  fillSelect($('#f-category'), CFG.CATEGORIES || [], '', '— Select category —');
  fillSelect($('#f-priority'), CFG.PRIORITIES || [], 'Normal');
  fillSelect($('#f-platform'), CFG.DELIVERY_PLATFORMS || [], 'Not applicable');
  fillSelect($('#f-callback'), ['No', 'Yes'], 'No');
}

function updateNextIdPreview() {
  const preview = nextComplaintId();
  $('#f-id').value = preview;
  $('#f-id-hint').textContent = state.mode === 'live'
    ? 'Preview only — the final ID is confirmed by the Google Sheets database on save.'
    : 'Assigned automatically on save.';
}

function resetFormDefaults() {
  const f = $('#complaint-form');
  f.reset();
  $('#f-datetime').value = nowLocalDT();
  $('#f-followup').value = addDaysStr(todayStr(), state.settings.followUpDays || 3);
  $('#f-platform').value = 'Not applicable';
  $('#f-callback').value = 'No';
  $('#f-priority').value = 'Normal';
  $$('.field.has-error', f).forEach(x => x.classList.remove('has-error'));
}

function renderRegisterPage() {
  updateNextIdPreview();
  const editing = !!state.editingId;
  $('#edit-banner').classList.toggle('hidden', !editing);
  if (editing) {
    const c = state.complaints.find(x => x.id === state.editingId);
    $('#edit-banner-id').textContent = editing ? c.id : '';
  }
  $('#btn-form-submit').textContent = editing ? 'Save changes' : 'Register complaint';
}

function startEdit(id) {
  const c = state.complaints.find(x => x.id === id);
  if (!c) { toast('Complaint not found', 'error'); return; }
  state.editingId = id;
  populateFormOptions();
  $('#f-id').value = c.id;
  $('#f-datetime').value = c.dateTime;
  $('#f-source').value = c.source;
  $('#f-branch').value = c.branch;
  $('#f-category').value = c.category;
  $('#f-priority').value = c.priority;
  $('#f-description').value = c.description;
  $('#f-order-number').value = c.orderNumber;
  $('#f-order-datetime').value = c.orderDateTime;
  $('#f-platform').value = c.deliveryPlatform || 'Not applicable';
  $('#f-customer').value = c.customerName;
  $('#f-phone').value = c.customerPhone;
  $('#f-review-url').value = c.reviewUrl;
  $('#f-employee').value = c.reportedBy;
  $('#f-callback').value = c.callbackRequired || 'No';
  $('#f-branch-contact').value = c.branchContact;
  $('#f-followup').value = c.followUpDate;
  route('register');
}

function readFormValues() {
  return {
    dateTime: $('#f-datetime').value,
    source: $('#f-source').value,
    branch: $('#f-branch').value,
    category: $('#f-category').value,
    priority: $('#f-priority').value,
    description: $('#f-description').value.trim(),
    orderNumber: $('#f-order-number').value.trim(),
    orderDateTime: $('#f-order-datetime').value,
    deliveryPlatform: $('#f-platform').value,
    customerName: $('#f-customer').value.trim(),
    customerPhone: $('#f-phone').value.trim(),
    reviewUrl: $('#f-review-url').value.trim(),
    reportedBy: $('#f-employee').value.trim(),
    callbackRequired: $('#f-callback').value,
    branchContact: $('#f-branch-contact').value.trim(),
    followUpDate: $('#f-followup').value
  };
}

function validateFormValues(v) {
  const errs = {};
  if (!v.dateTime) errs['f-datetime'] = 'Date and time are required.';
  if (!v.source) errs['f-source'] = 'Please select a source.';
  if (!v.branch) errs['f-branch'] = 'Please select a branch.';
  if (!v.category) errs['f-category'] = 'Please select a category.';
  if (!v.priority) errs['f-priority'] = 'Please select a priority.';
  if (!v.description || v.description.length < 5) errs['f-description'] = 'Please describe the complaint (at least 5 characters).';
  if (!v.customerName) errs['f-customer'] = 'Customer name is required.';
  if (!/^[+0-9][0-9 ()\-]{6,}$/.test(v.customerPhone)) errs['f-phone'] = 'Enter a valid phone number (min. 7 digits).';
  if (v.reviewUrl && !/^https?:\/\//i.test(v.reviewUrl)) errs['f-review-url'] = 'URL must start with http:// or https://';
  return errs;
}

function paintFormErrors(errs) {
  const form = $('#complaint-form');
  $$('.field.has-error', form).forEach(x => x.classList.remove('has-error'));
  Object.keys(errs).forEach(id => {
    const input = document.getElementById(id);
    const field = input && input.closest('.field');
    if (field) {
      field.classList.add('has-error');
      const p = $('.field-error', field);
      if (p) p.textContent = errs[id];
    }
  });
  const first = Object.keys(errs)[0];
  if (first && document.getElementById(first)) document.getElementById(first).focus();
}

function bindRegisterForm() {
  $('#complaint-form').addEventListener('submit', async e => {
    e.preventDefault();
    const vals = readFormValues();
    const errs = validateFormValues(vals);
    paintFormErrors(errs);
    if (Object.keys(errs).length) { toast('Please fix the highlighted fields', 'error'); return; }
    setBusy(true);
    try {
      if (state.editingId) {
        const old = state.complaints.find(c => c.id === state.editingId);
        await Store.updateComplaint(old.id, vals, { type: 'edit', detail: changeSummary(old, vals) });
        toast('Complaint ' + old.id + ' updated');
        state.editingId = null;
        resetFormDefaults();
        route('complaints');
      } else {
        const saved = await Store.createComplaint(vals);
        toast('Complaint ' + saved.id + ' registered');
        resetFormDefaults();
        updateNextIdPreview();
        rerenderCurrent();
      }
    } catch (err) {
      toast(err.message || 'Save failed', 'error');
    } finally {
      setBusy(false);
    }
  });

  $('#btn-form-reset').addEventListener('click', () => {
    state.editingId = null;
    resetFormDefaults();
    updateNextIdPreview();
    renderRegisterPage();
    toast('Form reset', 'info');
  });

  $('#btn-cancel-edit').addEventListener('click', () => {
    state.editingId = null;
    resetFormDefaults();
    renderRegisterPage();
  });
}

/* ================= 11. ALL COMPLAINTS TABLE ================= */

function complaintRowHTML(c) {
  const overdue = isOverdue(c);
  return '<tr data-id="' + esc(c.id) + '">' +
    '<td><button class="link-btn" data-action="view" data-id="' + esc(c.id) + '">' + esc(c.id) + '</button></td>' +
    '<td>' + esc(fmtDT(c.dateTime)) + '</td>' +
    '<td>' + esc(c.source) + '</td>' +
    '<td>' + esc(c.branch) + '</td>' +
    '<td>' + esc(c.category) + '</td>' +
    '<td>' + priorityChip(c.priority) + '</td>' +
    '<td>' + esc(c.customerName) + '<div class="sub-line">' + esc(c.customerPhone) + '</div></td>' +
    '<td>' + statusChip(c.status) + '</td>' +
    '<td class="' + (overdue ? 'text-red' : '') + '">' + (c.followUpDate ? esc(fmtD(c.followUpDate)) : '—') +
      (overdue ? '<div class="sub-line text-red">overdue</div>' : '') + '</td>' +
    '<td><div class="row-actions">' +
      '<button class="icon-btn small" data-action="view" data-id="' + esc(c.id) + '" title="View details" aria-label="View ' + esc(c.id) + '">' + icon('eye') + '</button>' +
      '<button class="icon-btn small" data-action="edit" data-id="' + esc(c.id) + '" title="Edit" aria-label="Edit ' + esc(c.id) + '">' + icon('edit') + '</button>' +
      '<button class="icon-btn small danger" data-action="delete" data-id="' + esc(c.id) + '" title="Delete (admin password required)" aria-label="Delete ' + esc(c.id) + '">' + icon('trash') + '</button>' +
    '</div></td>' +
  '</tr>';
}

function renderComplaintsPage() {
  populateFilterSelects();
  renderComplaintsTable();
  updateSortIndicators();
}

function populateFilterSelects() {
  fillSelect($('#flt-status'), CFG.STATUSES || [], state.flt.status, 'All statuses');
  fillSelect($('#flt-branch'), state.branches.map(b => b.name), state.flt.branch, 'All branches');
  fillSelect($('#flt-category'), CFG.CATEGORIES || [], state.flt.category, 'All categories');
  fillSelect($('#flt-priority'), CFG.PRIORITIES || [], state.flt.priority, 'All priorities');
  fillSelect($('#flt-source'), CFG.SOURCES || [], state.flt.source, 'All sources');
  $('#flt-status').value = state.flt.status;
  $('#flt-branch').value = state.flt.branch;
  $('#flt-category').value = state.flt.category;
  $('#flt-priority').value = state.flt.priority;
  $('#flt-source').value = state.flt.source;
  $('#flt-from').value = state.flt.from;
  $('#flt-to').value = state.flt.to;
}

function renderComplaintsTable() {
  const rows = getFilteredComplaints();
  const size = state.settings.rowsPerPage || 10;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  if (state.pageNum > pages) state.pageNum = pages;
  const start = (state.pageNum - 1) * size;
  const slice = rows.slice(start, start + size);

  $('#complaints-tbody').innerHTML = slice.length
    ? slice.map(complaintRowHTML).join('')
    : '<tr><td colspan="10">' +
        (state.complaints.length
          ? emptyState('No complaints match your filters', 'Try clearing the search or filters.', 'search')
          : emptyState('No complaints yet', 'Register your first complaint to get started.', 'filePlus')) +
      '</td></tr>';

  $('#pg-info').textContent = rows.length + ' complaint' + (rows.length === 1 ? '' : 's') +
    ' found · page ' + state.pageNum + ' of ' + pages;
  $('#pg-prev').disabled = state.pageNum <= 1;
  $('#pg-next').disabled = state.pageNum >= pages;
}

function updateSortIndicators() {
  $$('#complaints-table thead th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.sort === state.sort.key) th.classList.add(state.sort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
  });
}

function bindComplaintsPage() {
  $('#q').addEventListener('input', debounce(e => {
    state.q = e.target.value;
    state.pageNum = 1;
    renderComplaintsTable();
  }, 200));

  [['flt-status', 'status'], ['flt-branch', 'branch'], ['flt-category', 'category'],
   ['flt-priority', 'priority'], ['flt-source', 'source'], ['flt-from', 'from'], ['flt-to', 'to']]
    .forEach(([id, key]) => {
      $('#' + id).addEventListener('change', e => {
        state.flt[key] = e.target.value;
        state.pageNum = 1;
        renderComplaintsTable();
      });
    });

  $('#flt-clear').addEventListener('click', () => {
    state.flt = { status: '', branch: '', category: '', priority: '', source: '', from: '', to: '' };
    state.q = '';
    $('#q').value = '';
    state.pageNum = 1;
    populateFilterSelects();
    renderComplaintsTable();
  });

  $('#complaints-table thead').addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const key = th.dataset.sort;
    if (state.sort.key === key) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
    else state.sort = { key: key, dir: 'desc' };
    updateSortIndicators();
    renderComplaintsTable();
  });

  $('#pg-prev').addEventListener('click', () => { if (state.pageNum > 1) { state.pageNum--; renderComplaintsTable(); } });
  $('#pg-next').addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(getFilteredComplaints().length / (state.settings.rowsPerPage || 10)));
    if (state.pageNum < pages) { state.pageNum++; renderComplaintsTable(); }
  });
  $('#pg-size').addEventListener('change', e => {
    state.settings.rowsPerPage = parseInt(e.target.value, 10) || 10;
    saveSettings();
    state.pageNum = 1;
    renderComplaintsTable();
  });

  $('#btn-export-csv').addEventListener('click', () => {
    const rows = getFilteredComplaints();
    if (!rows.length) { toast('Nothing to export with current filters', 'info'); return; }
    exportComplaintsCSV(rows, 'HPB_complaints_' + todayStr() + '.csv');
  });
}

/* ---- Complaint deletion protection (admin password) ---------------------
   When DELETE_PROTECTION.ENABLED is true, deleting a complaint first asks
   for the administrator password. Staff can register and update complaints
   but cannot delete them — a record stays in the database and statistics
   once registered. Honest limit (README §6): client-side control on a
   static website; it stops everyday users, not a technical person. ------ */

function deleteProtectionCfg() {
  const D = CFG.DELETE_PROTECTION || {};
  const own = String(D.PASSWORD || '');
  const fallback = settingsLockCfg();        /* empty PASSWORD → reuse the Settings lock password */
  return { enabled: D.ENABLED !== false && (own || fallback.password) !== '', password: own || fallback.password };
}

/* Resolves true only if the correct admin password is entered.
   Cancel, backdrop click or Escape resolve false (nothing is deleted). */
function askDeletePassword(id) {
  return new Promise(resolve => {
    openModal(
      '<div class="modal-head"><h3>' + icon('lock') + ' Deletion restricted</h3></div>' +
      '<div class="modal-body">' +
        '<p class="muted small">Only the administrator can delete complaints. Enter the admin password ' +
        'to delete <strong>' + esc(id) + '</strong>. The password is set in <code>config.js</code>.</p>' +
        '<div class="field">' +
          '<label for="del-pass">Administrator password</label>' +
          '<div class="lock-row">' +
            '<input id="del-pass" class="inp" type="password" autocomplete="current-password" placeholder="Administrator password">' +
            '<button type="button" class="btn ghost" id="del-eye" aria-label="Show or hide password">Show</button>' +
          '</div>' +
          '<p class="field-error" id="del-err"></p>' +
        '</div>' +
      '</div>' +
      '<div class="modal-foot">' +
        '<button class="btn" id="del-cancel">Cancel</button>' +
        '<button class="btn danger" id="del-ok">Continue</button>' +
      '</div>', { small: true });

    const inp = $('#del-pass');
    const err = $('#del-err');
    inp.focus();

    const onKey = e => { if (e.key === 'Escape') finish(false); };
    function finish(v) {
      document.removeEventListener('keydown', onKey);
      $('#modal-root').innerHTML = '';
      document.body.classList.remove('no-scroll');
      resolve(v);
    }
    const tryPass = () => {
      const cfg = deleteProtectionCfg();
      if (inp.value === cfg.password) { finish(true); }
      else {
        err.textContent = 'Wrong password. Deletion is not allowed.';
        const box = $('.modal', $('#modal-root'));
        box.classList.remove('shake');
        void box.offsetWidth;
        box.classList.add('shake');
        inp.select();
      }
    };

    $('#del-ok').addEventListener('click', tryPass);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') tryPass(); });
    $('#del-eye').addEventListener('click', () => {
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      $('#del-eye').textContent = show ? 'Hide' : 'Show';
    });
    $('#del-cancel').addEventListener('click', () => finish(false));
    $('.modal-overlay', $('#modal-root')).addEventListener('click', e => { if (e.target.dataset.overlay) finish(false); });
    document.addEventListener('keydown', onKey);
  });
}

async function onDeleteComplaint(id) {
  const c = state.complaints.find(x => x.id === id);
  if (!c) return;
  /* Deletion protection: the admin password is required BEFORE the final
     DELETE confirmation. Without it the complaint cannot be deleted. */
  if (deleteProtectionCfg().enabled) {
    const allowed = await askDeletePassword(id);
    if (!allowed) return;
  }
  const ok = await confirmDialog({
    title: 'Delete complaint',
    message: 'Permanently delete ' + id + ' (' + c.customerName + ')? This cannot be undone.',
    confirmLabel: 'Delete', danger: true, typed: 'DELETE'
  });
  if (!ok) return;
  setBusy(true);
  try {
    await Store.deleteComplaint(id);
    toast('Complaint ' + id + ' deleted');
    closeModal();
    rerenderCurrent();
    updateNextIdPreview();
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(false); }
}

/* ================= 12. COMPLAINT DETAIL MODAL ================= */

function detailItem(dt, dd) {
  return '<div class="detail-item"><div class="dt">' + esc(dt) + '</div><div class="dd">' + (dd || '<span class="muted">—</span>') + '</div></div>';
}

function detailHTML(c) {
  const review = c.reviewUrl
    ? '<a href="' + esc(c.reviewUrl) + '" target="_blank" rel="noopener">Open review ' + icon('external').replace('<svg', '<svg style="display:inline;width:12px;height:12px;vertical-align:-2px"') + '</a>'
    : '';
  const phone = c.customerPhone ? '<a href="tel:' + esc(c.customerPhone.replace(/\s/g, '')) + '">' + esc(c.customerPhone) + '</a>' : '';

  const historyRows = (c.history || []).slice().reverse().map(h => {
    const meta = HISTORY_TYPES[h.type] || { label: h.type || 'Note', dot: 'grey' };
    return '<div class="tl-item">' +
      '<div class="tl-dot ' + meta.dot + '"></div>' +
      '<div><div class="tl-head">' + esc(h.detail || meta.label) + '</div>' +
      '<div class="tl-meta">' + esc(meta.label) + ' · ' + esc(fmtDT(h.ts)) + (h.by ? ' · by ' + esc(h.by) : '') + '</div></div>' +
    '</div>';
  }).join('');

  const isRes = c.status === 'Resolved' || c.status === 'Closed';

  return '<div class="modal-head">' +
      '<h3>' + esc(c.id) + ' ' + statusChip(c.status) + ' ' + priorityChip(c.priority) + '</h3>' +
      '<span class="spacer"></span>' +
      '<button class="btn small" data-da="print">' + icon('printer') + ' Print</button>' +
      '<button class="btn small" data-da="edit">' + icon('edit') + ' Edit</button>' +
      '<button class="btn small danger ghost" data-da="delete">' + icon('trash') + ' Delete</button>' +
      '<button class="icon-btn" data-action="close-modal" title="Close" aria-label="Close">' + icon('x') + '</button>' +
    '</div>' +
    '<div class="modal-body">' +

      '<div class="modal-section"><h4>Complaint details</h4><div class="detail-grid">' +
        detailItem('Received', esc(fmtDT(c.dateTime))) +
        detailItem('Source', esc(c.source)) +
        detailItem('Branch', esc(c.branch)) +
        detailItem('Category', esc(c.category)) +
        detailItem('Priority', priorityChip(c.priority)) +
        detailItem('Delivery platform', esc(c.deliveryPlatform)) +
        detailItem('Order number', esc(c.orderNumber)) +
        detailItem('Order date & time', esc(fmtDT(c.orderDateTime))) +
        detailItem('Customer', esc(c.customerName)) +
        detailItem('Customer phone', phone) +
        detailItem('Google review', review) +
        detailItem('Reported by', esc(c.reportedBy)) +
        detailItem('Callback required', esc(c.callbackRequired || 'No')) +
        detailItem('Branch contact', esc(c.branchContact)) +
        detailItem('Follow-up due', isOverdue(c) ? '<span class="text-red">' + esc(fmtD(c.followUpDate)) + ' · overdue</span>' : esc(fmtD(c.followUpDate))) +
        detailItem('Created', esc(fmtDT(c.createdAt))) +
        detailItem('Last updated', esc(fmtDT(c.updatedAt))) +
        detailItem('Resolved at', esc(fmtDT(c.resolvedAt))) +
      '</div></div>' +

      '<div class="modal-section"><h4>Description</h4><div class="desc-box">' + esc(c.description) + '</div></div>' +

      '<div class="modal-section"><h4>Resolution</h4><div class="desc-box">' + (c.resolution ? esc(c.resolution) : '<span class="muted">Not resolved yet.</span>') + '</div></div>' +

      '<div class="modal-section"><h4>Actions</h4><div class="action-grid">' +
        '<div class="action-cell"><div class="ac-title">Update status</div>' +
          '<div class="ac-row"><select id="d-status" class="inp" style="flex:1">' +
            (CFG.STATUSES || []).map(s => '<option value="' + esc(s) + '"' + (s === c.status ? ' selected' : '') + '>' + esc(s) + '</option>').join('') +
          '</select><button class="btn small primary" data-da="status">Apply</button></div>' +
        '</div>' +
        '<div class="action-cell"><div class="ac-title">Assign to branch</div>' +
          '<div class="ac-row"><select id="d-assign-branch" class="inp" style="flex:1">' +
            state.branches.filter(b => b.active).map(b => '<option value="' + esc(b.name) + '"' + (b.name === c.branch ? ' selected' : '') + '>' + esc(b.name) + '</option>').join('') +
          '</select></div>' +
          '<div class="ac-row"><input id="d-assign-contact" class="inp" style="flex:1" placeholder="Contact person" value="' + esc(c.branchContact) + '">' +
          '<button class="btn small primary" data-da="assign">Assign</button></div>' +
        '</div>' +
        '<div class="action-cell"><div class="ac-title">Follow-up</div>' +
          '<div class="ac-row"><input id="d-followup-date" type="date" class="inp" value="' + esc(c.followUpDate) + '">' +
          '<input id="d-followup-note" class="inp" style="flex:1" placeholder="Follow-up note (optional)"></div>' +
          '<div class="ac-row"><button class="btn small primary" data-da="followup">Save follow-up</button></div>' +
        '</div>' +
        '<div class="action-cell"><div class="ac-title">Add activity note</div>' +
          '<div class="ac-row"><input id="d-note" class="inp" style="flex:1" placeholder="What happened / what was done?">' +
          '<button class="btn small primary" data-da="note">Add note</button></div>' +
        '</div>' +
        '<div class="action-cell"><div class="ac-title">Resolution</div>' +
          '<div class="ac-row"><textarea id="d-resolution" class="inp" rows="2" placeholder="How was it resolved?">' + esc(c.resolution) + '</textarea></div>' +
          '<div class="ac-row"><button class="btn small primary" data-da="resolve">Mark resolved</button></div>' +
        '</div>' +
        '<div class="action-cell"><div class="ac-title">Close / reopen</div><div class="ac-row">' +
          (isRes
            ? '<button class="btn small" data-da="reopen">' + icon('history') + ' Reopen complaint</button>'
            : '<button class="btn small" data-da="close">' + icon('check') + ' Close complaint</button>') +
        '</div></div>' +
      '</div></div>' +

      '<div class="modal-section"><h4>History &amp; activity</h4>' +
        (historyRows ? '<div class="timeline">' + historyRows + '</div>'
                     : '<p class="muted small">No history recorded.</p>') +
      '</div>' +
    '</div>';
}

function openDetail(id) {
  const c = state.complaints.find(x => x.id === id);
  if (!c) { toast('Complaint not found', 'error'); return; }
  state.currentDetailId = id;
  openModal(detailHTML(c));
}

async function applyStatus(c, newStatus) {
  if (newStatus === c.status) { toast('Status is already "' + newStatus + '"', 'info'); return; }
  const patch = { status: newStatus };
  if (newStatus === 'Resolved' || newStatus === 'Closed') {
    if (!c.resolvedAt) patch.resolvedAt = nowLocalDT();
  } else if (isResolvedLike(c)) {
    patch.resolvedAt = '';                       // reopening clears resolution timestamp
  }
  await Store.updateComplaint(c.id, patch, { type: 'status', detail: c.status + ' → ' + newStatus });
  toast(c.id + ' status updated to ' + newStatus);
}

async function handleDetailAction(da) {
  const id = state.currentDetailId;
  const c = state.complaints.find(x => x.id === id);
  if (!c) return;

  if (da === 'status')      { await applyStatus(c, $('#d-status').value); }
  else if (da === 'assign') {
    const branch = $('#d-assign-branch').value;
    const contact = $('#d-assign-contact').value.trim();
    const patch = { branchContact: contact };
    if (c.status === 'New') patch.status = 'Assigned to Branch';
    await Store.updateComplaint(c.id, patch,
      { type: 'assigned', detail: 'Assigned to ' + branch + (contact ? ' (' + contact + ')' : '') });
    toast('Assigned to ' + branch);
  }
  else if (da === 'followup') {
    const date = $('#d-followup-date').value;
    const note = $('#d-followup-note').value.trim();
    const patch = {};
    if (date && date !== c.followUpDate) patch.followUpDate = date;
    if (!Object.keys(patch).length && !note) { toast('Nothing to update', 'info'); return; }
    await Store.updateComplaint(c.id, patch,
      note ? { type: 'followup', detail: 'Follow-up ' + (date ? 'set to ' + date + '. ' : '') + 'Note: ' + note }
           : { type: 'followup', detail: 'Follow-up date set to ' + fmtD(date) });
    toast('Follow-up saved');
  }
  else if (da === 'note') {
    const note = $('#d-note').value.trim();
    if (!note) { toast('Type a note first', 'info'); return; }
    await Store.updateComplaint(c.id, {}, { type: 'note', detail: note });
    toast('Note added');
  }
  else if (da === 'resolve') {
    const resolution = $('#d-resolution').value.trim();
    const patch = { status: 'Resolved', resolution: resolution };
    if (!c.resolvedAt) patch.resolvedAt = nowLocalDT();
    await Store.updateComplaint(c.id, patch,
      { type: 'resolved', detail: resolution ? 'Resolved: ' + resolution.slice(0, 200) : 'Marked as resolved' });
    toast(c.id + ' marked as resolved');
  }
  else if (da === 'close') {
    const patch = { status: 'Closed' };
    if (!c.resolvedAt) patch.resolvedAt = nowLocalDT();
    await Store.updateComplaint(c.id, patch, { type: 'status', detail: c.status + ' → Closed' });
    toast(c.id + ' closed');
  }
  else if (da === 'reopen') {
    await Store.updateComplaint(c.id, { status: 'Under Investigation', resolvedAt: '' },
      { type: 'reopened', detail: 'Complaint reopened' });
    toast(c.id + ' reopened');
  }
  else if (da === 'print')  { printComplaint(c); return; }
  else if (da === 'edit')   { closeModal(); startEdit(c.id); return; }
  else if (da === 'delete') { closeModal(); onDeleteComplaint(c.id); return; }

  await rerenderCurrent();
  openDetail(c.id);          // refresh the modal with fresh data
}

function printComplaint(c) {
  const row = (a, b) => '<tr><th style="width:180px">' + esc(a) + '</th><td>' + (b || '') + '</td></tr>';
  const hist = (c.history || []).map(h => {
    const meta = HISTORY_TYPES[h.type] || { label: h.type || 'Note' };
    return '<tr><td style="white-space:nowrap">' + esc(fmtDT(h.ts)) + '</td><td>' + esc(meta.label) + '</td><td>' + esc(h.detail) + '</td><td>' + esc(h.by || '') + '</td></tr>';
  }).join('');
  printHTML('Complaint ' + c.id,
    '<table>' +
      row('Complaint ID', esc(c.id)) + row('Received', esc(fmtDT(c.dateTime))) + row('Source', esc(c.source)) +
      row('Branch', esc(c.branch)) + row('Category', esc(c.category)) + row('Priority', esc(c.priority)) +
      row('Status', esc(c.status)) + row('Order number', esc(c.orderNumber)) +
      row('Order date & time', esc(fmtDT(c.orderDateTime))) + row('Delivery platform', esc(c.deliveryPlatform)) +
      row('Customer', esc(c.customerName)) + row('Customer phone', esc(c.customerPhone)) +
      row('Google review URL', esc(c.reviewUrl)) + row('Reported by', esc(c.reportedBy)) +
      row('Callback required', esc(c.callbackRequired)) + row('Branch contact', esc(c.branchContact)) +
      row('Follow-up due', esc(fmtD(c.followUpDate))) + row('Resolved at', esc(fmtDT(c.resolvedAt))) +
    '</table>' +
    '<h4>Description</h4><p>' + esc(c.description) + '</p>' +
    '<h4>Resolution</h4><p>' + (c.resolution ? esc(c.resolution) : '—') + '</p>' +
    '<h4>History</h4><table><tr><th>When</th><th>Type</th><th>Detail</th><th>By</th></tr>' + (hist || '<tr><td colspan="4">No history</td></tr>') + '</table>');
}

/* ================= 13. FOLLOW-UPS ================= */

function fupLists() {
  const today = todayStr();
  const in7 = addDaysStr(today, 7);
  const open = state.complaints.filter(isOpen);
  return {
    today:    open.filter(c => c.followUpDate === today).sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime))),
    overdue:  open.filter(c => c.followUpDate && c.followUpDate < today).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)),
    upcoming: open.filter(c => c.followUpDate > today && c.followUpDate <= in7).sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)),
    branch:   open.filter(c => c.status === 'Assigned to Branch').sort((a, b) => a.dateTime.localeCompare(b.dateTime)),
    customer: open.filter(c => c.status === 'Waiting for Customer').sort((a, b) => a.dateTime.localeCompare(b.dateTime))
  };
}

function fupTabTitles() {
  return {
    today: 'Today\'s follow-ups', overdue: 'Overdue follow-ups', upcoming: 'Upcoming (next 7 days)',
    branch: 'Waiting for branch response', customer: 'Waiting for customer response'
  };
}

function fupRowHTML(c, opts) {
  opts = opts || {};
  const lastNote = (c.history || []).filter(h => h.type === 'note' || h.type === 'followup').slice(-1)[0];
  const isOver = isOverdue(c);
  return '<div class="card fup-row' + (c.priority === 'Urgent' ? ' urgent' : '') + (isOver ? ' overdue-row' : '') + '" data-id="' + esc(c.id) + '">' +
    '<div class="fup-main">' +
      '<div class="list-title"><button class="link-btn" data-action="view" data-id="' + esc(c.id) + '">' + esc(c.id) + '</button>' +
        priorityChip(c.priority) + statusChip(c.status) +
        (isOver ? '<span class="chip chip-red">Overdue</span>' : '') +
      '</div>' +
      '<div class="list-sub">' + esc(c.branch) + ' · ' + esc(c.category) + ' · ' + esc(c.customerName) + ' · ' + esc(c.customerPhone) + '</div>' +
      '<div class="list-sub">Due: ' + (c.followUpDate ? esc(fmtD(c.followUpDate)) : '—') +
        (lastNote ? ' · Last note: ' + esc(String(lastNote.detail).slice(0, 90)) : '') + '</div>' +
    '</div>' +
    '<div class="fup-actions">' +
      '<label>Follow-up date<input type="date" class="inp fup-date" value="' + esc(c.followUpDate) + '"></label>' +
      '<label>Note<input type="text" class="inp fup-note" placeholder="Add follow-up note"></label>' +
      '<button class="btn small primary" data-action="fup-save" data-id="' + esc(c.id) + '">Save</button>' +
      '<button class="btn small" data-action="view" data-id="' + esc(c.id) + '">Open</button>' +
    '</div>' +
  '</div>';
}

function renderFollowups() {
  const lists = fupLists();
  $('#tc-today').textContent = lists.today.length;
  $('#tc-overdue').textContent = lists.overdue.length;
  $('#tc-upcoming').textContent = lists.upcoming.length;
  $('#tc-branch').textContent = lists.branch.length;
  $('#tc-customer').textContent = lists.customer.length;

  $$('#fup-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.fupTab === state.fupTab));

  const tab = state.fupTab;
  const rows = lists[tab] || [];
  const titles = fupTabTitles();
  $('#fup-content').innerHTML = rows.length
    ? '<h3 class="muted" style="font-size:13px;margin-bottom:12px">' + titles[tab] + ' (' + rows.length + ')</h3>' +
      rows.map(c => fupRowHTML(c)).join('')
    : emptyState('Nothing here', titles[tab] + ' — this list is empty right now.', 'check');
}

async function onFupSave(btn) {
  const id = btn.dataset.id;
  const c = state.complaints.find(x => x.id === id);
  if (!c) return;
  const row = btn.closest('.fup-row');
  const date = $('.fup-date', row).value;
  const note = $('.fup-note', row).value.trim();

  const patch = {};
  if (date && date !== c.followUpDate) patch.followUpDate = date;
  if (!Object.keys(patch).length && !note) { toast('Nothing to update', 'info'); return; }

  setBusy(true);
  try {
    await Store.updateComplaint(id, patch,
      note ? { type: 'followup', detail: 'Follow-up ' + (date ? 'set to ' + date + '. ' : '') + 'Note: ' + note }
           : { type: 'followup', detail: 'Follow-up date set to ' + fmtD(date) });
    toast('Follow-up saved for ' + id);
    renderFollowups();
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(false); }
}

/* ================= 14. BRANCH MANAGEMENT ================= */

function renderBranches() {
  const note = $('#branch-count-note');
  note.textContent = state.branches.length + ' of 15 branches configured — add the remaining branches and edit names as needed.';

  $('#branches-tbody').innerHTML = state.branches.map((b, i) => {
    const total = state.complaints.filter(c => c.branch === b.name).length;
    const open = state.complaints.filter(c => c.branch === b.name && isOpen(c)).length;
    return '<tr>' +
      '<td><strong>' + esc(b.name) + '</strong></td>' +
      '<td>' + (b.contact ? esc(b.contact) : '<span class="muted">—</span>') + '</td>' +
      '<td>' + (b.phone ? esc(b.phone) : '<span class="muted">—</span>') + '</td>' +
      '<td>' + total + '</td>' +
      '<td>' + (open ? '<span class="chip chip-orange">' + open + ' open</span>' : '0') + '</td>' +
      '<td>' + (b.active ? '<span class="branch-active-yes">Active</span>' : '<span class="branch-active-no">Inactive</span>') + '</td>' +
      '<td><div class="row-actions">' +
        '<button class="icon-btn small" data-action="branch-edit" data-idx="' + i + '" title="Edit branch" aria-label="Edit ' + esc(b.name) + '">' + icon('edit') + '</button>' +
        '<button class="icon-btn small danger" data-action="branch-del" data-idx="' + i + '" title="Delete branch" aria-label="Delete ' + esc(b.name) + '">' + icon('trash') + '</button>' +
      '</div></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="7">' + emptyState('No branches', 'Add your first branch to get started.', 'building') + '</td></tr>';
}

function branchModal(idx) {
  const isNew = idx < 0;
  const b = isNew ? { name: '', contact: '', phone: '', active: true } : state.branches[idx];
  openModal(
    '<div class="modal-head"><h3>' + (isNew ? 'Add branch' : 'Edit branch') + '</h3><span class="spacer"></span>' +
      '<button class="icon-btn" data-action="close-modal" aria-label="Close">' + icon('x') + '</button></div>' +
    '<div class="modal-body">' +
      '<div class="field"><label>Branch name <span class="req">*</span></label><input id="b-name" class="inp" value="' + esc(b.name) + '"><p class="field-error"></p></div>' +
      '<div class="field" style="margin-top:10px"><label>Contact person</label><input id="b-contact" class="inp" value="' + esc(b.contact) + '"></div>' +
      '<div class="field" style="margin-top:10px"><label>Phone</label><input id="b-phone" class="inp" value="' + esc(b.phone) + '"></div>' +
      '<div class="field" style="margin-top:10px;flex-direction:row;align-items:center;gap:8px">' +
        '<input type="checkbox" id="b-active" style="width:16px;height:16px"' + (b.active ? ' checked' : '') + '>' +
        '<label for="b-active" style="margin:0">Active (available in forms and charts)</label>' +
      '</div>' +
    '</div>' +
    '<div class="modal-foot"><button class="btn" data-action="close-modal">Cancel</button>' +
      '<button class="btn primary" data-da="branch-save" data-idx="' + idx + '">' + (isNew ? 'Add branch' : 'Save changes') + '</button></div>',
    { small: true }
  );
}

async function saveBranchFromModal(idx) {
  const name = $('#b-name').value.trim();
  const contact = $('#b-contact').value.trim();
  const phone = $('#b-phone').value.trim();
  const active = $('#b-active').checked;

  if (!name) {
    const f = $('#b-name').closest('.field');
    f.classList.add('has-error');
    $('.field-error', f).textContent = 'Branch name is required.';
    return;
  }
  const duplicate = state.branches.some((x, i) => i !== idx && x.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    const f = $('#b-name').closest('.field');
    f.classList.add('has-error');
    $('.field-error', f).textContent = 'A branch with this name already exists.';
    return;
  }

  const isNew = idx < 0;
  const oldName = isNew ? null : state.branches[idx].name;
  const list = state.branches.slice();
  const record = { name: name, contact: contact, phone: phone, active: active };

  setBusy(true);
  try {
    if (isNew) {
      list.push(record);
      await Store.saveBranches(list);
      toast('Branch "' + name + '" added');
    } else {
      list[idx] = record;
      const affected = state.complaints.filter(c => c.branch === oldName).length;
      if (oldName !== name && affected > 0) {
        closeModal();
        const ok = await confirmDialog({
          title: 'Rename branch',
          message: 'Rename "' + oldName + '" to "' + name + '"? ' + affected + ' complaint record(s) will be updated to the new branch name.',
          confirmLabel: 'Rename branch'
        });
        if (!ok) { renderBranches(); return; }
        await Store.saveBranches(list);
        await Store.renameBranch(oldName, name);
        toast('Branch renamed; ' + affected + ' complaint(s) updated');
      } else {
        await Store.saveBranches(list);
        if (oldName !== name) await Store.renameBranch(oldName, name);
        toast('Branch saved');
      }
    }
    closeModal();
    populateFormOptions();
    rerenderCurrent();
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(false); }
}

async function onDeleteBranch(idx) {
  const b = state.branches[idx];
  if (!b) return;
  const affected = state.complaints.filter(c => c.branch === b.name).length;
  if (affected > 0) {
    toast('Cannot delete "' + b.name + '" — ' + affected + ' complaint(s) reference it. Reassign or delete those complaints first.', 'error');
    return;
  }
  const ok = await confirmDialog({
    title: 'Delete branch',
    message: 'Delete branch "' + b.name + '"? This cannot be undone.',
    confirmLabel: 'Delete', danger: true
  });
  if (!ok) return;
  setBusy(true);
  try {
    const list = state.branches.slice();
    list.splice(idx, 1);
    await Store.saveBranches(list);
    toast('Branch deleted');
    populateFormOptions();
    rerenderCurrent();
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(false); }
}

/* ================= 15. DAILY REPORT ================= */

function dailyData(date) {
  const rec = state.complaints.filter(c => dayOf(c.dateTime) === date);
  const resolvedToday = state.complaints.filter(c => dayOf(c.resolvedAt) === date);
  const k = {
    received: rec.length,
    resolved: resolvedToday.length,
    fresh: rec.filter(c => c.status === 'New').length,
    pending: rec.filter(isOpen).length,
    urgent: rec.filter(c => c.priority === 'Urgent').length,
    overdue: rec.filter(c => isOverdue(c, date)).length
  };
  const branchRows = state.branches.map(b => {
    const r = rec.filter(c => c.branch === b.name);
    return {
      name: b.name,
      received: r.length,
      resolved: r.filter(c => dayOf(c.resolvedAt) === date).length,
      open: r.filter(isOpen).length,
      urgent: r.filter(c => c.priority === 'Urgent').length,
      overdue: r.filter(c => isOverdue(c, date)).length
    };
  }).filter(r => r.received || r.resolved);
  const catRows = countBy(rec, c => c.category).map(x => ({
    cat: x.key, received: x.count,
    resolved: rec.filter(c => c.category === x.key && dayOf(c.resolvedAt) === date).length
  }));
  return { date, k, branchRows, catRows, rec };
}

function renderDaily() {
  const dateInput = $('#daily-date');
  if (!dateInput.value) dateInput.value = todayStr();
  const d = dailyData(dateInput.value);

  const cards = [
    { label: 'Received today', value: d.k.received, ic: 'inbox' },
    { label: 'Resolved today', value: d.k.resolved, ic: 'checkCircle' },
    { label: 'Still "New"', value: d.k.fresh, ic: 'filePlus' },
    { label: 'Pending (open)', value: d.k.pending, ic: 'clock' },
    { label: 'Urgent received', value: d.k.urgent, ic: 'zap', alert: d.k.urgent > 0 },
    { label: 'Overdue', value: d.k.overdue, ic: 'alert', alert: d.k.overdue > 0 }
  ];
  $('#daily-cards').innerHTML = cards.map(x =>
    '<div class="kpi-card' + (x.alert ? ' alert' : '') + '"><div class="kpi-icon">' + icon(x.ic) + '</div>' +
    '<div><div class="kpi-label">' + esc(x.label) + '</div><div class="kpi-value">' + x.value + '</div></div></div>'
  ).join('');

  $('#daily-branch-tbody').innerHTML = d.branchRows.length
    ? d.branchRows.map(r =>
        '<tr><td><strong>' + esc(r.name) + '</strong></td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' + r.open + '</td><td>' + r.urgent + '</td><td>' + r.overdue + '</td></tr>'
      ).join('') +
      '<tr><td><strong>Total</strong></td><td><strong>' + d.k.received + '</strong></td><td><strong>' + d.k.resolved + '</strong></td><td><strong>' + d.k.pending + '</strong></td><td><strong>' + d.k.urgent + '</strong></td><td><strong>' + d.k.overdue + '</strong></td></tr>'
    : '<tr><td colspan="6">' + emptyState('No complaints on this date', 'Pick another date or register a complaint.', 'calendar') + '</td></tr>';

  $('#daily-cat-tbody').innerHTML = d.catRows.length
    ? d.catRows.map(r =>
        '<tr><td>' + esc(r.cat) + '</td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' +
        (d.k.received ? Math.round(100 * r.received / d.k.received) + '%' : '—') + '</td></tr>'
      ).join('')
    : '<tr><td colspan="4">' + emptyState('No data', 'No complaints on this date.', 'chart') + '</td></tr>';
}

function dailyCSV() {
  const d = dailyData($('#daily-date').value || todayStr());
  const rows = [];
  rows.push(['Huff & Puff Burger - Daily complaint report']);
  rows.push(['Date', d.date]);
  rows.push(['Generated', nowLocalDT()]);
  rows.push([]);
  rows.push(['Metric', 'Value']);
  rows.push(['Received today', d.k.received]);
  rows.push(['Resolved today', d.k.resolved]);
  rows.push(['New complaints', d.k.fresh]);
  rows.push(['Pending complaints', d.k.pending]);
  rows.push(['Urgent complaints', d.k.urgent]);
  rows.push(['Overdue complaints', d.k.overdue]);
  rows.push([]);
  rows.push(['Branch', 'Received', 'Resolved', 'Open', 'Urgent', 'Overdue']);
  d.branchRows.forEach(r => rows.push([r.name, r.received, r.resolved, r.open, r.urgent, r.overdue]));
  rows.push([]);
  rows.push(['Category', 'Received', 'Resolved', 'Share %']);
  d.catRows.forEach(r => rows.push([r.cat, r.received, r.resolved, d.k.received ? Math.round(100 * r.received / d.k.received) : '']));
  downloadFile('HPB_daily_report_' + d.date + '.csv', buildCSV(rows), 'text/csv;charset=utf-8');
  toast('Daily report exported');
}

function dailyPrint() {
  const d = dailyData($('#daily-date').value || todayStr());
  const kpiRow = (a, b) => '<tr><th>' + esc(a) + '</th><td>' + b + '</td></tr>';
  printHTML('Daily report — ' + fmtD(d.date),
    '<table>' + kpiRow('Received today', d.k.received) + kpiRow('Resolved today', d.k.resolved) +
      kpiRow('New complaints', d.k.fresh) + kpiRow('Pending complaints', d.k.pending) +
      kpiRow('Urgent complaints', d.k.urgent) + kpiRow('Overdue complaints', d.k.overdue) + '</table>' +
    '<h4>Branch-wise breakdown</h4><table><tr><th>Branch</th><th>Received</th><th>Resolved</th><th>Open</th><th>Urgent</th><th>Overdue</th></tr>' +
      d.branchRows.map(r => '<tr><td>' + esc(r.name) + '</td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' + r.open + '</td><td>' + r.urgent + '</td><td>' + r.overdue + '</td></tr>').join('') + '</table>' +
    '<h4>Category breakdown</h4><table><tr><th>Category</th><th>Received</th><th>Resolved</th><th>Share</th></tr>' +
      d.catRows.map(r => '<tr><td>' + esc(r.cat) + '</td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' + (d.k.received ? Math.round(100 * r.received / d.k.received) + '%' : '—') + '</td></tr>').join('') + '</table>');
}

/* ================= 16. WEEKLY REPORT ================= */

function weeklyData(from, to) {
  const inRange = state.complaints.filter(c => { const d = dayOf(c.dateTime); return d >= from && d <= to; });
  const resolvedInRange = inRange.filter(c => c.resolvedAt && dayOf(c.resolvedAt) >= from && dayOf(c.resolvedAt) <= to);
  const durations = resolvedInRange
    .map(c => (new Date(c.resolvedAt) - new Date(c.dateTime)) / 86400000)
    .filter(x => !isNaN(x) && x >= 0);
  const avgDays = durations.length ? Math.round(10 * durations.reduce((a, b) => a + b, 0) / durations.length) / 10 : null;

  /* Repeat complaints: same customer phone with 2+ complaints inside the range */
  const byPhone = new Map();
  inRange.forEach(c => {
    const p = String(c.customerPhone || '').replace(/\D/g, '');
    if (p.length >= 7) { if (!byPhone.has(p)) byPhone.set(p, []); byPhone.get(p).push(c); }
  });
  const repeatPhones = Array.from(byPhone.entries()).filter(e => e[1].length >= 2);

  const k = {
    total: inRange.length,
    resolved: resolvedInRange.length,
    outstanding: inRange.filter(isOpen).length,
    urgent: inRange.filter(c => c.priority === 'Urgent').length,
    overdue: inRange.filter(c => isOverdue(c)).length,
    avgDays
  };

  const branchRows = state.branches.map(b => {
    const r = inRange.filter(c => c.branch === b.name);
    const rr = r.filter(c => c.resolvedAt && dayOf(c.resolvedAt) >= from && dayOf(c.resolvedAt) <= to);
    const durs = rr.map(c => (new Date(c.resolvedAt) - new Date(c.dateTime)) / 86400000).filter(x => !isNaN(x) && x >= 0);
    return {
      name: b.name, received: r.length, resolved: rr.length,
      outstanding: r.filter(isOpen).length, urgent: r.filter(c => c.priority === 'Urgent').length,
      avgDays: durs.length ? Math.round(10 * durs.reduce((a, x) => a + x, 0) / durs.length) / 10 : null,
      repeatCustomers: repeatPhones.filter(e => e[1].some(c => c.branch === b.name)).length,
      repeatComplaints: r.filter(c => repeatPhones.some(e => e[1].includes(c))).length
    };
  }).filter(r => r.received || r.resolved);

  const catRows = countBy(inRange, c => c.category).map(x => ({
    cat: x.key, received: x.count,
    resolved: resolvedInRange.filter(c => c.category === x.key).length
  }));
  const srcRows = countBy(inRange, c => c.source);

  return { from, to, k, branchRows, catRows, srcRows, repeatCount: repeatPhones.length };
}

function renderWeekly() {
  const fromInput = $('#weekly-from'), toInput = $('#weekly-to');
  if (!fromInput.value || !toInput.value) {
    const w = weekRange();
    fromInput.value = w[0]; toInput.value = w[1];
  }
  const d = weeklyData(fromInput.value, toInput.value);

  const cards = [
    { label: 'Total complaints', value: d.k.total, ic: 'layers' },
    { label: 'Total resolved', value: d.k.resolved, ic: 'checkCircle' },
    { label: 'Outstanding', value: d.k.outstanding, ic: 'inbox', alert: d.k.outstanding > 0 },
    { label: 'Avg resolution', value: d.k.avgDays === null ? '—' : d.k.avgDays + ' d', ic: 'history' },
    { label: 'Urgent', value: d.k.urgent, ic: 'zap', alert: d.k.urgent > 0 },
    { label: 'Overdue', value: d.k.overdue, ic: 'clock', alert: d.k.overdue > 0 }
  ];
  $('#weekly-cards').innerHTML = cards.map(x =>
    '<div class="kpi-card' + (x.alert ? ' alert' : '') + '"><div class="kpi-icon">' + icon(x.ic) + '</div>' +
    '<div><div class="kpi-label">' + esc(x.label) + '</div><div class="kpi-value">' + esc(String(x.value)) + '</div></div></div>'
  ).join('');

  const dash = '—';
  $('#weekly-branch-tbody').innerHTML = d.branchRows.length
    ? d.branchRows.map(r =>
        '<tr><td><strong>' + esc(r.name) + '</strong></td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' + r.outstanding + '</td><td>' + r.urgent + '</td><td>' + (r.avgDays === null ? dash : r.avgDays) + '</td></tr>'
      ).join('')
    : '<tr><td colspan="6">' + emptyState('No complaints in this range', 'Adjust the date range.', 'calendar') + '</td></tr>';

  $('#weekly-cat-tbody').innerHTML = d.catRows.length
    ? d.catRows.map(r =>
        '<tr><td>' + esc(r.cat) + '</td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' +
        (d.k.total ? Math.round(100 * r.received / d.k.total) + '%' : dash) + '</td></tr>'
      ).join('')
    : '<tr><td colspan="4">' + emptyState('No data', 'No complaints in this range.', 'chart') + '</td></tr>';

  $('#weekly-src-tbody').innerHTML = d.srcRows.length
    ? d.srcRows.map(r =>
        '<tr><td>' + esc(r.key) + '</td><td>' + r.count + '</td><td>' +
        (d.k.total ? Math.round(100 * r.count / d.k.total) + '%' : dash) + '</td></tr>'
      ).join('')
    : '<tr><td colspan="3">' + emptyState('No data', 'No complaints in this range.', 'chart') + '</td></tr>';

  $('#weekly-repeat-tbody').innerHTML = d.branchRows.filter(r => r.repeatComplaints > 0).length
    ? d.branchRows.filter(r => r.repeatComplaints > 0)
        .sort((a, b) => b.repeatComplaints - a.repeatComplaints)
        .map(r => '<tr><td><strong>' + esc(r.name) + '</strong></td><td>' + r.repeatCustomers + '</td><td>' + r.repeatComplaints + '</td></tr>').join('')
    : '<tr><td colspan="3">' + emptyState('No repeat complaints', 'No customer filed 2+ complaints in this range.', 'check') + '</td></tr>';
}

function weeklyCSV() {
  const d = weeklyData($('#weekly-from').value, $('#weekly-to').value);
  const rows = [];
  rows.push(['Huff & Puff Burger - Weekly complaint report']);
  rows.push(['Period', d.from + ' to ' + d.to]);
  rows.push(['Generated', nowLocalDT()]);
  rows.push([]);
  rows.push(['Metric', 'Value']);
  rows.push(['Total complaints', d.k.total]);
  rows.push(['Total resolved', d.k.resolved]);
  rows.push(['Outstanding complaints', d.k.outstanding]);
  rows.push(['Average resolution time (days)', d.k.avgDays === null ? '' : d.k.avgDays]);
  rows.push(['Urgent complaints', d.k.urgent]);
  rows.push(['Overdue complaints', d.k.overdue]);
  rows.push([]);
  rows.push(['Branch', 'Received', 'Resolved', 'Outstanding', 'Urgent', 'Avg days', 'Repeat customers', 'Repeat complaints']);
  d.branchRows.forEach(r => rows.push([r.name, r.received, r.resolved, r.outstanding, r.urgent, r.avgDays === null ? '' : r.avgDays, r.repeatCustomers, r.repeatComplaints]));
  rows.push([]);
  rows.push(['Category', 'Received', 'Resolved', 'Share %']);
  d.catRows.forEach(r => rows.push([r.cat, r.received, r.resolved, d.k.total ? Math.round(100 * r.received / d.k.total) : '']));
  rows.push([]);
  rows.push(['Source', 'Received', 'Share %']);
  d.srcRows.forEach(r => rows.push([r.key, r.count, d.k.total ? Math.round(100 * r.count / d.k.total) : '']));
  downloadFile('HPB_weekly_report_' + d.from + '_' + d.to + '.csv', buildCSV(rows), 'text/csv;charset=utf-8');
  toast('Weekly report exported');
}

function weeklyPrint() {
  const d = weeklyData($('#weekly-from').value, $('#weekly-to').value);
  const kpiRow = (a, b) => '<tr><th>' + esc(a) + '</th><td>' + b + '</td></tr>';
  printHTML('Weekly report — ' + fmtD(d.from) + ' to ' + fmtD(d.to),
    '<table>' + kpiRow('Total complaints', d.k.total) + kpiRow('Total resolved', d.k.resolved) +
      kpiRow('Outstanding complaints', d.k.outstanding) +
      kpiRow('Average resolution time', d.k.avgDays === null ? '—' : d.k.avgDays + ' days') +
      kpiRow('Urgent complaints', d.k.urgent) + kpiRow('Overdue complaints', d.k.overdue) + '</table>' +
    '<h4>Branch comparison</h4><table><tr><th>Branch</th><th>Received</th><th>Resolved</th><th>Outstanding</th><th>Urgent</th><th>Avg days</th></tr>' +
      d.branchRows.map(r => '<tr><td>' + esc(r.name) + '</td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' + r.outstanding + '</td><td>' + r.urgent + '</td><td>' + (r.avgDays === null ? '—' : r.avgDays) + '</td></tr>').join('') + '</table>' +
    '<h4>Category comparison</h4><table><tr><th>Category</th><th>Received</th><th>Resolved</th><th>Share</th></tr>' +
      d.catRows.map(r => '<tr><td>' + esc(r.cat) + '</td><td>' + r.received + '</td><td>' + r.resolved + '</td><td>' + (d.k.total ? Math.round(100 * r.received / d.k.total) + '%' : '—') + '</td></tr>').join('') + '</table>' +
    '<h4>Source comparison</h4><table><tr><th>Source</th><th>Received</th><th>Share</th></tr>' +
      d.srcRows.map(r => '<tr><td>' + esc(r.key) + '</td><td>' + r.count + '</td><td>' + (d.k.total ? Math.round(100 * r.count / d.k.total) + '%' : '—') + '</td></tr>').join('') + '</table>');
}

/* ================= 17. SETTINGS PAGE ================= */

function connStatusHTML() {
  const live = state.mode === 'live';
  return '<div class="conn-line"><strong>Status</strong>' +
      (live ? '<span class="chip chip-green">LIVE — Google Sheets</span>' : '<span class="chip chip-orange">DEMO — this browser only</span>') +
    '</div>' +
    '<div class="conn-line"><strong>Web App URL</strong><span class="small" style="word-break:break-all">' +
      (getApiUrl() ? esc(getApiUrl()) : '<span class="muted">Not configured</span>') + '</span></div>' +
    '<div class="conn-line"><strong>Records</strong>' + state.complaints.length + ' complaints · ' + state.branches.length + ' branches</div>' +
    (state.sync.lastSync ? '<div class="conn-line"><strong>Last sync</strong>' + esc(fmtDT(state.sync.lastSync)) + '</div>' : '') +
    (state.sync.error ? '<div class="conn-line"><strong>Last error</strong><span class="text-red">' + esc(state.sync.error) + '</span></div>' : '');
}

function renderSettings() {
  $('#conn-status').innerHTML = connStatusHTML();
  $('#set-url').value = state.settings.urlOverride === DEMO_SENTINEL ? '' : getApiUrl();
  $('#set-name').value = state.settings.userName || '';
  $('#set-rows').value = String(state.settings.rowsPerPage || 10);
  $('#set-followup-days').value = String(state.settings.followUpDays || 3);

  const demo = state.mode === 'demo';
  $('#settings-mode-note').textContent = demo
    ? 'Demo Mode: tools below affect only the demo dataset stored in this browser.'
    : 'Live Mode: connected to Google Sheets. Import and demo tools are disabled to protect company data.';
  $('#btn-import').disabled = !demo;
  $('#btn-load-demo').disabled = !demo;
  $('#btn-clear-demo').disabled = !demo;
  $('#btn-reload-live').disabled = demo;
  $('#about-version').textContent = CFG.VERSION || '1.0.0';
  /* Show the "Lock now" button only when the lock feature is enabled. */
  $('#btn-lock-settings').classList.toggle('hidden', !settingsLockCfg().enabled);
}

function bindSettingsPage() {
  /* Lock the Settings page again and go back to the dashboard. */
  $('#btn-lock-settings').addEventListener('click', () => {
    lockSettingsNow();
    toast('Settings locked', 'info');
    route('dashboard');
  });

  $('#set-name').addEventListener('change', e => { state.settings.userName = e.target.value.trim(); saveSettings(); updateHeader(); toast('Preference saved', 'info'); });
  $('#set-rows').addEventListener('change', e => { state.settings.rowsPerPage = parseInt(e.target.value, 10) || 10; saveSettings(); toast('Preference saved', 'info'); });
  $('#set-followup-days').addEventListener('change', e => {
    state.settings.followUpDays = Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 3));
    saveSettings();
    toast('Preference saved', 'info');
  });

  $('#set-save-url').addEventListener('click', async () => {
    const url = $('#set-url').value.trim();
    state.settings.urlOverride = url || DEMO_SENTINEL;
    lsSet(LS_KEYS.URL, state.settings.urlOverride);
    setBusy(true);
    try {
      await Store.loadAll();
      state.sync.error = null;
      toast(url ? 'Connected to Google Sheets' : 'Switched to Demo Mode');
    } catch (err) {
      state.sync.error = err.message;
      toast('Connection failed: ' + err.message, 'error');
    }
    setBusy(false);
    updateHeader();
    populateFormOptions();
    renderSettings();
    rerenderCurrent();
  });

  $('#set-test').addEventListener('click', async () => {
    const url = $('#set-url').value.trim();
    if (!url) { toast('Enter a Web App URL first (or stay in Demo Mode).', 'info'); return; }
    setBusy(true);
    try {
      const saved = state.settings.urlOverride;
      state.settings.urlOverride = url;
      const res = await apiGet('ping');
      state.settings.urlOverride = saved;
      toast('Connection OK — ' + (res.service || 'Apps Script') + ' · spreadsheet: ' + (res.spreadsheet || '?'));
      $('#conn-status').innerHTML = connStatusHTML();
    } catch (err) {
      state.sync.error = err.message;
      updateHeader();
      toast('Test failed: ' + err.message, 'error');
    }
    setBusy(false);
  });

  $('#set-clear-url').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Disconnect',
      message: 'Disconnect from Google Sheets and switch to Demo Mode? Company data in the sheet stays untouched; you will see the demo dataset instead.',
      confirmLabel: 'Disconnect'
    });
    if (!ok) return;
    state.settings.urlOverride = DEMO_SENTINEL;
    lsSet(LS_KEYS.URL, DEMO_SENTINEL);
    state.sync.error = null;
    try { await Store.loadAll(); } catch (err) { state.sync.error = err.message; }
    updateHeader();
    populateFormOptions();
    renderSettings();
    rerenderCurrent();
    toast('Disconnected — running in Demo Mode', 'info');
  });

  $('#btn-backup').addEventListener('click', () => {
    const payload = {
      exportedAt: nowLocalDT(),
      mode: state.mode,
      version: CFG.VERSION || '1.0.0',
      complaints: state.complaints,
      branches: state.branches
    };
    downloadFile('HPB_backup_' + todayStr().replace(/-/g, '') + '.json', JSON.stringify(payload, null, 2), 'application/json');
    toast('Backup exported (JSON)');
  });

  $('#btn-import').addEventListener('click', () => {
    if (state.mode === 'live') { toast('Import is only available in Demo Mode (see note above).', 'info'); return; }
    $('#import-file').click();
  });
  $('#import-file').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.complaints) || !Array.isArray(data.branches)) throw new Error('File does not look like an HPB backup.');
        const ok = await confirmDialog({
          title: 'Import backup',
          message: 'Replace the current demo data with ' + data.complaints.length + ' complaint(s) and ' + data.branches.length + ' branch(es) from the backup?',
          confirmLabel: 'Import', danger: true
        });
        if (!ok) return;
        state.complaints = data.complaints.map(normalizeComplaint);
        state.branches = data.branches.map(normalizeBranch);
        persistComplaints();
        persistBranches();
        populateFormOptions();
        renderSettings();
        rerenderCurrent();
        toast('Backup imported');
      } catch (err) { toast('Import failed: ' + err.message, 'error'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  $('#btn-load-demo').addEventListener('click', async () => {
    if (state.mode === 'live') { toast('Demo data is never loaded in Live Mode.', 'info'); return; }
    const ok = await confirmDialog({
      title: 'Load demo dataset',
      message: 'Replace the current browser data with the fictional demo dataset (18 labelled demo complaints)?',
      confirmLabel: 'Load demo data'
    });
    if (!ok) return;
    seedDemoDataset();
    rerenderCurrent();
    renderSettings();
    toast('Demo dataset loaded (clearly labelled demo records)');
  });

  $('#btn-clear-demo').addEventListener('click', async () => {
    if (state.mode === 'live') { toast('Company data cannot be cleared from here. Use the Google Sheet.', 'info'); return; }
    const ok = await confirmDialog({
      title: 'Clear all demo data',
      message: 'Delete ALL complaint records stored in this browser? This cannot be undone.',
      confirmLabel: 'Clear data', danger: true, typed: 'DELETE'
    });
    if (!ok) return;
    state.complaints = [];
    persistComplaints();
    state.branches = (CFG.BRANCHES || []).slice();
    persistBranches();
    populateFormOptions();
    renderSettings();
    rerenderCurrent();
    toast('All demo data cleared');
  });

  $('#btn-reload-live').addEventListener('click', async () => {
    setBusy(true);
    try {
      await Store.reload();
      state.sync.error = null;
      toast('Reloaded from Google Sheets');
      rerenderCurrent();
      renderSettings();
    } catch (err) {
      state.sync.error = err.message;
      updateHeader();
      toast('Reload failed: ' + err.message, 'error');
    }
    setBusy(false);
  });
}

/* ================= 18. CSV / BACKUP ================= */

/* Prevents spreadsheet formula injection for values like =SUM(...) */
function csvCell(v) {
  let s = String(v === null || v === undefined ? '' : v);
  if (/^[=+\-@\t]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}
function buildCSV(rows) {
  return '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

function exportComplaintsCSV(list, filename) {
  const header = ['Complaint ID', 'Received', 'Source', 'Branch', 'Order number', 'Order date/time',
    'Category', 'Priority', 'Description', 'Delivery platform', 'Customer name', 'Customer phone',
    'Google review URL', 'Reported by', 'Callback required', 'Branch contact', 'Follow-up date',
    'Status', 'Resolution', 'Resolved at', 'Created', 'Updated'];
  const rows = [header];
  list.forEach(c => rows.push([
    c.id, c.dateTime, c.source, c.branch, c.orderNumber, c.orderDateTime, c.category, c.priority,
    c.description, c.deliveryPlatform, c.customerName, c.customerPhone, c.reviewUrl, c.reportedBy,
    c.callbackRequired, c.branchContact, c.followUpDate, c.status, c.resolution, c.resolvedAt,
    c.createdAt, c.updatedAt
  ]));
  downloadFile(filename, buildCSV(rows), 'text/csv;charset=utf-8');
  toast(list.length + ' complaint(s) exported to CSV');
}

/* ================= 19. INIT & GLOBAL EVENTS ================= */

async function init() {
  loadSettings();
  $('#version-label').textContent = 'v' + (CFG.VERSION || '1.0.0');
  $('#btn-menu').innerHTML = icon('menu');
  $('#btn-refresh').innerHTML = icon('refresh');
  buildNav();
  bindRegisterForm();
  bindComplaintsPage();
  bindSettingsPage();
  bindGlobalEvents();
  $('#btn-logout').classList.toggle('hidden', !loginCfg().enabled);

  setBusy(true);
  try {
    await Store.loadAll();
    state.sync.error = null;
  } catch (err) {
    state.sync.error = err.message || String(err);
  }
  setBusy(false);

  populateFormOptions();
  resetFormDefaults();
  updateHeader();
  route('dashboard');
}

function bindGlobalEvents() {
  /* Sidebar (mobile) */
  $('#btn-menu').addEventListener('click', () => {
    $('#sidebar').classList.add('open');
    $('#sidebar-overlay').classList.add('show');
  });
  $('#sidebar-overlay').addEventListener('click', closeSidebar);

  /* Refresh */
  $('#btn-refresh').addEventListener('click', async () => {
    setBusy(true);
    try {
      await Store.reload();
      state.sync.error = null;
      updateHeader();
      populateFormOptions();
      rerenderCurrent();
      toast(state.mode === 'live' ? 'Reloaded from Google Sheets' : 'Data reloaded', 'info');
    } catch (err) {
      state.sync.error = err.message;
      updateHeader();
      toast('Reload failed: ' + err.message, 'error');
    }
    setBusy(false);
  });

  /* Global click delegation: navigation + row actions */
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]');
    if (nav) { e.preventDefault(); route(nav.dataset.nav); return; }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'view') { openDetail(id); return; }
    if (action === 'edit') { startEdit(id); return; }
    if (action === 'delete') { onDeleteComplaint(id); return; }
    if (action === 'retry') { init(); return; }
    if (action === 'close-modal') { closeModal(); return; }
    if (action === 'fup-save') { onFupSave(btn); return; }
    if (action === 'branch-edit') { branchModal(parseInt(btn.dataset.idx, 10)); return; }
    if (action === 'branch-del') { onDeleteBranch(parseInt(btn.dataset.idx, 10)); return; }
  });

  /* Detail modal + branch modal actions */
  $('#modal-root').addEventListener('click', async e => {
    const overlay = e.target.closest('.modal-overlay');
    if (overlay && e.target === overlay) { closeModal(); return; }
    const b = e.target.closest('[data-da]');
    if (!b) return;
    const da = b.dataset.da;

    if (da === 'branch-save') { await saveBranchFromModal(parseInt(b.dataset.idx, 10)); return; }
    if (!state.currentDetailId) return;
    setBusy(true);
    try { await handleDetailAction(da); }
    catch (err) { toast(err.message || 'Action failed', 'error'); }
    finally { setBusy(false); }
  });

  /* Confirm dialog backdrop */
  $('#confirm-root').addEventListener('click', e => {
    /* handled inside confirmDialog listeners; no-op here to avoid double handling */
  });

  /* Follow-up tabs */
  $('#fup-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    state.fupTab = tab.dataset.fupTab;
    renderFollowups();
  });

  /* Branch management */
  $('#btn-add-branch').addEventListener('click', () => branchModal(-1));

  /* Reports */
  $('#daily-date').addEventListener('change', renderDaily);
  $('#daily-csv').addEventListener('click', dailyCSV);
  $('#daily-print').addEventListener('click', dailyPrint);
  $('#weekly-from').addEventListener('change', renderWeekly);
  $('#weekly-to').addEventListener('change', renderWeekly);
  $('#weekly-csv').addEventListener('click', weeklyCSV);
  $('#weekly-print').addEventListener('click', weeklyPrint);

  /* Log out (site login) */
  $('#btn-logout').addEventListener('click', onLogout);

  /* Escape closes modal */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/* Boot: if site login is enabled and this browser is not signed in yet,
   show the login screen first — init() runs only after a successful sign-in. */
document.addEventListener('DOMContentLoaded', () => {
  if (loginCfg().enabled && !loginUnlocked()) {
    showLoginScreen();
    return;
  }
  init();
});
