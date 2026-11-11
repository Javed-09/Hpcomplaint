/**
 * ============================================================================
 * HUFF & PUFF BURGER — Complaint Management System
 * google-apps-script.gs — backend for the static website (Google Sheets DB)
 * ----------------------------------------------------------------------------
 * This script runs INSIDE Google Apps Script (not on the website). It turns a
 * Google Sheet into a free, persistent, shared database for the website.
 *
 * HOW TO DEPLOY (full walkthrough in README.md):
 *   1. Create a new Google Sheet (e.g. "HPB Complaints Database").
 *   2. In the Sheet: Extensions -> Apps Script.
 *   3. Delete the default code, paste THIS file, save.
 *   4. Run the function "setup" once (authorise when asked) — it creates the
 *      Complaints + Branches tabs and seeds the 13 default branches.
 *   5. Deploy -> New deployment -> Web app
 *         Execute as:        Me
 *         Who has access:    Anyone        (required for the website!)
 *   6. Authorise the project, copy the Web App URL (ends in /exec).
 *   7. Paste that URL into config.js (APPS_SCRIPT_URL) on the website.
 *   8. Test: open the URL in a browser — you should see JSON with "ok": true.
 *
 * AFTER CHANGING THIS CODE:
 *   Deploy -> Manage deployments -> pencil icon -> Version: "New version".
 *   The URL stays the same; without a new version the website sees old code.
 *
 * API ACTIONS (GET with ?action=... for reads, POST with JSON body for writes):
 *   ping              -> {ok, service, spreadsheet}
 *   getComplaints     -> {ok, complaints:[...]}
 *   getBranches       -> {ok, branches:[...]}
 *   createComplaint   POST {complaint}                    (ID generated here)
 *   updateComplaint   POST {id, patch, historyEntry}
 *   deleteComplaint   POST {id}
 *   saveBranches      POST {branches:[...]}               (replaces the list)
 *   renameBranch      POST {from, to}                     (cascades to complaints)
 *   getStats          -> {ok, stats:{...}}                (optional summary)
 *
 * SECURITY LIMITATIONS (important, please read README.md "Security" too):
 *   - A Web App deployed with "Anyone" access is a PUBLIC endpoint. Anyone who
 *     obtains the URL can read and write every complaint in the sheet.
 *   - A secret/token embedded in the website's JavaScript is NOT secure — it
 *     is visible in the page source. Do not rely on it for real protection.
 *   - Keep the Web App URL private and share it only with authorised staff.
 * ============================================================================
 */

var SPREADSHEET_ID = '';            // leave '' when the script is bound to the Sheet
var SHEET_COMPLAINTS = 'Complaints';
var SHEET_BRANCHES = 'Branches';

/* Field order == column order in the sheet. Do not reorder after data exists. */
var COMPLAINT_FIELDS = [
  'id', 'dateTime', 'source', 'branch', 'orderNumber', 'orderDateTime', 'category',
  'priority', 'description', 'deliveryPlatform', 'customerName', 'customerPhone',
  'reviewUrl', 'reportedBy', 'callbackRequired', 'branchContact', 'followUpDate',
  'status', 'resolution', 'resolvedAt', 'history', 'createdAt', 'updatedAt'
];
var BRANCH_FIELDS = ['name', 'contact', 'phone', 'active'];

var DEFAULT_BRANCHES = [
  'Muroor', 'Jumeirah', 'Khalifa', 'Rabdan', 'Falah', 'Ajman', 'Sharjah',
  'Fujairah', 'Shahama', 'Baniyas', 'RAK', 'Zakher', 'Al Ain'
];

/* ------------------------------------------------------------------ router */

function doGet(e)  { return route_(e); }
function doPost(e) { return route_(e); }

function route_(e) {
  try {
    var action = '', payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
      action = payload.action || '';
    } else if (e && e.parameter && e.parameter.action) {
      action = e.parameter.action;
    }

    switch (action) {
      case 'ping':            return json_({ ok: true, service: 'HPB Complaints API', version: '1.0.0', time: nowStr_(), spreadsheet: ss_().getName() });
      case 'getComplaints':   return json_({ ok: true, complaints: getComplaints_() });
      case 'getBranches':     return json_({ ok: true, branches: getBranches_() });
      case 'createComplaint': return json_(createComplaint_(payload.complaint || {}));
      case 'updateComplaint': return json_(updateComplaint_(payload.id, payload.patch || {}, payload.historyEntry || null));
      case 'deleteComplaint': return json_(deleteComplaint_(payload.id));
      case 'saveBranches':    return json_(saveBranches_(payload.branches || []));
      case 'renameBranch':    return json_(renameBranch_(payload.from, payload.to));
      case 'getStats':        return json_({ ok: true, stats: getStats_() });
      default:                return json_({ ok: false, error: 'Unknown or missing action' });
    }
  } catch (err) {
    return json_({ ok: false, error: (err && err.message) ? err.message : String(err) });
  }
}

/* ------------------------------------------------------------- one-time setup */

/** Run once from the Apps Script editor (Run -> setup). Idempotent. */
function setup() {
  ensureComplaintsSheet_();
  ensureBranchesSheet_();
  var sh = branchesSheet_();
  if (sh.getLastRow() < 2) {
    var rows = DEFAULT_BRANCHES.map(function (n) { return [n, '', '', 'Yes']; });
    sh.getRange(2, 1, rows.length, 4).setValues(rows);
  }
  Logger.log('Setup complete. Sheets ready: ' + ss_().getName());
}

/** Adds a small menu inside the Sheet for convenience. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HPB Complaints')
    .addItem('Run setup (create tabs + default branches)', 'setup')
    .addToUi();
}

/* ------------------------------------------------------------------ helpers */

function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function headerLabel_(field) { return field.charAt(0).toUpperCase() + field.slice(1); }

function ensureComplaintsSheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(SHEET_COMPLAINTS);
  if (!sh) {
    sh = ss.insertSheet(SHEET_COMPLAINTS);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, COMPLAINT_FIELDS.length)
      .setValues([COMPLAINT_FIELDS.map(headerLabel_)])
      .setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureBranchesSheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(SHEET_BRANCHES);
  if (!sh) {
    sh = ss.insertSheet(SHEET_BRANCHES);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, BRANCH_FIELDS.length)
      .setValues([BRANCH_FIELDS.map(headerLabel_)])
      .setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function complaintsSheet_() { return ensureComplaintsSheet_(); }
function branchesSheet_()   { return ensureBranchesSheet_(); }

function nowStr_()   { return Utilities.formatDate(new Date(), tz_(), "yyyy-MM-dd'T'HH:mm"); }
function todayStr_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }
function tz_()       { return Session.getScriptTimeZone() || 'Asia/Dubai'; }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Normalises a cell value to the string format the website expects. */
function cellToStr_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var fmt = (v.getHours() || v.getMinutes()) ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-MM-dd';
    return Utilities.formatDate(v, tz_(), fmt);
  }
  return String(v);
}

function rowsToObjects_(sh, fields) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, fields.length).getValues();
  return values.map(function (row, i) {
    var o = { _row: i + 2 };
    for (var j = 0; j < fields.length; j++) o[fields[j]] = cellToStr_(row[j]);
    return o;
  });
}

function historyOf_(raw) {
  if (Array.isArray(raw)) return raw;
  try { var h = JSON.parse(raw); return Array.isArray(h) ? h : []; } catch (e) { return []; }
}

function pad5_(n) { return ('0000' + n).slice(-5); }

/* ------------------------------------------------------------------ reads */

function getComplaints_() {
  var rows = rowsToObjects_(complaintsSheet_(), COMPLAINT_FIELDS);
  return rows.map(function (r) {
    var c = {};
    COMPLAINT_FIELDS.forEach(function (f) { c[f] = r[f] === undefined ? '' : r[f]; });
    c.history = historyOf_(c.history);
    delete c._row;
    if (!c.status) c.status = 'New';
    return c;
  });
}

function getBranches_() {
  var rows = rowsToObjects_(branchesSheet_(), BRANCH_FIELDS);
  return rows.map(function (r) {
    return {
      name: r.name,
      contact: r.contact,
      phone: r.phone,
      active: (r.active === 'Yes' || r.active === 'true' || r.active === 'TRUE' || r.active === '')
    };
  });
}

/* ------------------------------------------------------------------ writes */

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function nextId_(rows) {
  var max = 0;
  rows.forEach(function (r) {
    var m = /^HPB-(\d+)$/.exec(String(r.id || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return 'HPB-' + pad5_(max + 1);
}

function appendComplaintRow_(sh, c) {
  var row = COMPLAINT_FIELDS.map(function (f) {
    if (f === 'history') return JSON.stringify(c.history || []);
    return c[f] === null || c[f] === undefined ? '' : String(c[f]);
  });
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function createComplaint_(input) {
  return withLock_(function () {
    var sh = complaintsSheet_();
    var existing = rowsToObjects_(sh, COMPLAINT_FIELDS);

    var now = nowStr_();
    var c = {};
    COMPLAINT_FIELDS.forEach(function (f) {
      c[f] = input[f] === null || input[f] === undefined ? '' : String(input[f]);
    });
    if (!c.status) c.status = 'New';

    /* The server is the single source of truth for IDs. */
    var requested = String(input.id || '').trim();
    var taken = existing.some(function (r) { return r.id === requested; });
    if (!requested || taken) c.id = nextId_(existing);

    c.createdAt = now;
    c.updatedAt = now;
    c.history = historyOf_(input.history);
    if (!c.history.length) {
      c.history = [{ ts: now, type: 'created', detail: 'Complaint registered (' + c.id + ')', by: 'API' }];
    }

    appendComplaintRow_(sh, c);
    return { ok: true, complaint: c };
  });
}

function updateComplaint_(id, patch, historyEntry) {
  return withLock_(function () {
    if (!id) throw new Error('Missing complaint id');
    var sh = complaintsSheet_();
    var rows = rowsToObjects_(sh, COMPLAINT_FIELDS);
    var target = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) { target = rows[i]; break; }
    }
    if (!target) throw new Error('Complaint not found: ' + id);

    var editable = COMPLAINT_FIELDS.filter(function (f) {
      return f !== 'id' && f !== 'createdAt' && f !== 'updatedAt' && f !== 'history';
    });
    editable.forEach(function (f) {
      if (Object.prototype.hasOwnProperty.call(patch, f)) {
        target[f] = patch[f] === null || patch[f] === undefined ? '' : String(patch[f]);
      }
    });

    var history = historyOf_(target.history);
    if (historyEntry && (historyEntry.detail || historyEntry.type)) {
      history.push({
        ts: historyEntry.ts || nowStr_(),
        type: historyEntry.type || 'note',
        detail: String(historyEntry.detail || ''),
        by: String(historyEntry.by || 'API')
      });
    }
    target.history = history;
    target.updatedAt = nowStr_();

    var row = COMPLAINT_FIELDS.map(function (f) {
      if (f === 'history') return JSON.stringify(target.history);
      return target[f] === null || target[f] === undefined ? '' : String(target[f]);
    });
    sh.getRange(target._row, 1, 1, row.length).setValues([row]);

    var out = {};
    COMPLAINT_FIELDS.forEach(function (f) { out[f] = target[f]; });
    out.history = target.history;
    return { ok: true, complaint: out };
  });
}

function deleteComplaint_(id) {
  return withLock_(function () {
    if (!id) throw new Error('Missing complaint id');
    var sh = complaintsSheet_();
    var rows = rowsToObjects_(sh, COMPLAINT_FIELDS);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === id) {
        sh.deleteRow(rows[i]._row);
        return { ok: true };
      }
    }
    throw new Error('Complaint not found: ' + id);
  });
}

function saveBranches_(list) {
  return withLock_(function () {
    var sh = branchesSheet_();
    if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    if (list.length) {
      var rows = list.map(function (b) {
        return [
          String(b.name || '').trim(),
          String(b.contact || ''),
          String(b.phone || ''),
          (b.active === false || String(b.active) === 'No') ? 'No' : 'Yes'
        ];
      });
      sh.getRange(2, 1, rows.length, BRANCH_FIELDS.length).setValues(rows);
    }
    return { ok: true, branches: getBranches_() };
  });
}

/* Renaming a branch cascades: every complaint row keeps pointing at the same
   physical branch under its new name. */
function renameBranch_(from, to) {
  return withLock_(function () {
    if (!from || !to) throw new Error('renameBranch needs "from" and "to"');
    var updated = 0;

    var bsh = branchesSheet_();
    var brows = rowsToObjects_(bsh, BRANCH_FIELDS);
    brows.forEach(function (b) {
      if (b.name === from) {
        bsh.getRange(b._row, 1).setValue(to);
      }
    });

    var csh = complaintsSheet_();
    var crows = rowsToObjects_(csh, COMPLAINT_FIELDS);
    crows.forEach(function (r) {
      if (r.branch === from) {
        csh.getRange(r._row, 4).setValue(to);   // column 4 = branch
        updated++;
      }
    });
    return { ok: true, updated: updated };
  });
}

/* ------------------------------------------------------------------ stats */

/* Optional server-side summary (the website also computes stats client-side
   from getComplaints; this action is provided for integrations/exports). */
function getStats_() {
  var list = getComplaints_();
  var today = todayStr_();
  var openStatuses = ['New', 'Assigned to Branch', 'Under Investigation', 'Waiting for Customer'];
  var stats = { total: list.length, today: 0, open: 0, resolved: 0, urgent: 0, overdue: 0, waitingBranch: 0, avgResolutionDays: null };
  var durSum = 0, durN = 0;

  list.forEach(function (c) {
    var isOpen = openStatuses.indexOf(c.status) >= 0;
    if (String(c.dateTime).slice(0, 10) === today) stats.today++;
    if (isOpen) stats.open++;
    if (c.status === 'Resolved' || c.status === 'Closed') stats.resolved++;
    if (c.priority === 'Urgent' && isOpen) stats.urgent++;
    if (isOpen && c.followUpDate && c.followUpDate < today) stats.overdue++;
    if (c.status === 'Assigned to Branch') stats.waitingBranch++;
    if (c.resolvedAt) {
      var d = (new Date(c.resolvedAt) - new Date(c.dateTime)) / 86400000;
      if (!isNaN(d) && d >= 0) { durSum += d; durN++; }
    }
  });
  stats.avgResolutionDays = durN ? Math.round(durSum / durN * 10) / 10 : null;
  return stats;
}
