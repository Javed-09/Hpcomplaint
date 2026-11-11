# Huff & Puff Burger — Complaint Management System

A complete, professional customer complaint management dashboard for the Huff & Puff Burger restaurant chain (UAE, 15 branches).

- **Technology:** HTML5 + CSS3 + vanilla JavaScript. No React, no Node.js, no PHP, no build tools, no paid services.
- **Hosting:** works on **GitHub Pages** (free) or by simply opening `index.html` in a browser.
- **Shared database:** Google Sheets through a free **Google Apps Script Web App** — complaints entered by any user on any computer are saved centrally.
- **Demo mode:** if no database is configured, the site runs in a clearly-labelled **Demo Mode** using the browser's localStorage. Demo data is fictional and **never mixes** with real company complaints.

---

## 1. Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole application UI (single page, 8 sections) |
| `style.css` | Design: black / white / orange / light grey, responsive |
| `script.js` | Application logic (forms, tables, charts, reports, storage) |
| `config.js` | **The only file you need to edit** — database URL, branches, option lists |
| `demo-data.js` | Separately stored, clearly-labelled fictional demo dataset |
| `google-apps-script.gs` | Backend code to paste into Google Apps Script |
| `README.md` | This guide |

> Charts use Chart.js from a free CDN. If the CDN is unreachable, every other feature (tables, forms, reports, exports) keeps working.

---

## 2. Quick start (30 seconds, demo mode)

1. Download / copy all files into one folder.
2. Double-click `index.html` — the dashboard opens in **Demo Mode** with 18 fictional complaints (`HPB-00001` … `HPB-00018`) so you can try everything risk-free.
3. The orange banner at the top always reminds you: demo data lives **only in this browser** and is **not** shared with other devices or users.

---

## 3. Connect the Google Sheets database (the real setup)

### 3.1 Create the Google Sheet

1. Go to <https://sheets.google.com> with a company Google account.
2. Create a blank spreadsheet, e.g. named **`HPB Complaints Database`**.

### 3.2 Add the backend code

1. In the spreadsheet menu: **Extensions → Apps Script**.
2. Delete the default `Code.gs` content.
3. Open the file `google-apps-script.gs` (from this project), copy **all** of it, paste it into the Apps Script editor, and press **Save** (disk icon).

### 3.3 Run setup once

1. In the toolbar of the Apps Script editor, choose the function **`setup`** and click **Run**.
2. Google asks for authorisation → **Review permissions → choose your account → Advanced → Go to HPB Complaints API (unsafe) → Allow**.
   ("Unsafe" only means the app is unverified — it is *your own* script accessing *your own* sheet.)
3. The script creates two tabs:
   - **Complaints** — one row per complaint (23 columns, matching the website fields)
   - **Branches** — seeded with the 13 default branches

### 3.4 Deploy as a Web App

1. Top-right: **Deploy → New deployment**.
2. Click the gear icon → choose **Web app**.
3. Set:
   - Description: `HPB complaints backend`
   - **Execute as: Me**
   - **Who has access: Anyone** ← required, otherwise the website cannot call it
4. Click **Deploy**, then **Copy** the Web App URL (ends in `/exec`).

### 3.5 Connect the website

Open `config.js` and paste the URL into the single configuration variable:

```js
APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec",
```

Save and refresh the website. The header pill changes from **DEMO MODE** to **LIVE · GOOGLE SHEETS**.

Alternatively (without editing the file), paste the URL in **Settings → Google Sheets connection → Save & connect**. The URL is then stored in the browser; the `config.js` variable remains the project-wide default.

### 3.6 Test the connection

- Open the Web App URL directly in a browser tab → you should see JSON starting with `{"ok":true,...}`.
- Or use **Settings → Test connection** in the website.
- Register a test complaint → a new row appears in the **Complaints** tab of the sheet.

### 3.7 Updating the backend later

If you change `google-apps-script.gs`: **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same. Without a new version the website keeps talking to the old code.

---

## 4. Publish on GitHub Pages (free hosting)

1. Create a GitHub account if you do not have one: <https://github.com/signup>.
2. Click **+ → New repository**, name it e.g. `hpb-complaints`, set it to **Public**, create it.
3. Upload all website files (`index.html`, `style.css`, `script.js`, `config.js`, `demo-data.js`, `README.md`): **Add file → Upload files → drag & drop → Commit changes**.
   (`google-apps-script.gs` can be uploaded too — harmless, and good for backup.)
4. Open the repository **Settings**.
5. In the left sidebar open **Pages**.
6. Under "Build and deployment", set **Source: Deploy from a branch**.
7. Select **Branch: main** and **Folder: / (root)**, then **Save**.
8. Wait ~1 minute, open the shown URL (e.g. `https://YOUR-USERNAME.github.io/hpb-complaints/`) — the dashboard is live. Share this link with the complaint coordinator and management.

No npm, no command line, no paid service is involved. To publish updates, upload the changed files again (commit). If the page shows a 404 right after deploying, wait a minute and refresh.

---

## 5. Daily workflow (complaint coordinator)

> **Sign-in required:** with the default configuration the whole site opens with a **login screen** — see §5.0.

1. **Register Complaint** — fill the form (ID is generated automatically, e.g. `HPB-00021`), required fields are validated inline.
2. **All Complaints** — search / filter / sort; open a complaint (eye icon) to:
   - **Assign to branch** (sets contact person + status *Assigned to Branch*),
   - change **status**, add **follow-up date + note**, add **activity notes**,
   - write the **resolution** and **Mark resolved**, or **Close** / **Reopen**,
   - **Print** the complaint, or **Delete** it — deletion is **password-protected** (see §5.2): only you can delete, and typing `DELETE` is still required as a second confirmation.
3. **Follow-ups** — tabs for *Today*, *Overdue*, *Next 7 days*, *Waiting for branch*, *Waiting for customer*. Dates and notes can be edited right in the row.
4. **Daily / Weekly Reports** — automatic KPIs, branch/category/source breakdowns, repeat-complaint detection; **Export CSV** or **Print**.
5. **Branch Management** — add the remaining 2 branches (13 of 15 are pre-loaded), edit names (complaint records are updated automatically), set contacts, deactivate unused branches.
6. **Settings** — connection status, your display name (stored in history entries), rows per page, default follow-up window, JSON backup export/import, demo tools. The page is **password-locked** (see §5.1).

### 5.0 Site login (sign-in screen)

From v1.3.0 the **whole website** sits behind a password: until the correct password is entered, nobody sees any complaints, reports or the database settings.

- The sign-in screen appears automatically when the site is opened.
- Correct password → the app loads. Tick **"Keep me signed in on this device"** on your own trusted computer to skip the login next time.
- **Log out** (button in the top bar) signs out immediately — use it on shared branch computers. It forgets both the session and the "keep me signed in" tick.
- One **shared staff password** — there are no individual user accounts (that would require a real user database, which a free static site cannot host honestly).
- Configuration lives in `config.js` → `LOGIN`:
  - `ENABLED: true / false` — switch the login screen on or off,
  - `PASSWORD: "hpb-admin"` — **change this before going live** (same place as the other passwords; see §5.1/§5.2 for how the three passwords relate),
  - `REMEMBER_DEVICE: true / false` — show or hide the "Keep me signed in" checkbox.
- Technical notes: "Keep me signed in" is stored per device in the browser's localStorage; without it, the sign-in lasts for the current browser tab session only (opening a new tab may ask again). Clearing the browser's site data also signs out.
- Honest limit: this is a **client-side login** — it comfortably stops casual staff, but it is not real server authentication (see §6).

### 5.1 Locking the Settings page

The Settings page holds the database connection and data tools, so it is protected by a password:

- When anyone clicks **Settings**, a lock dialog asks for the administrator password.
- Correct password → the page opens **for this browser tab session**. Tick *"Remember on this device"* on your own office computer to skip the prompt day-to-day.
- **Lock settings** (top-right button on the Settings page) locks it again immediately and returns to the dashboard.
- The default password is `hpb-admin`. **Change it in `config.js` → `SETTINGS_LOCK.PASSWORD` before going live.**
- Set `SETTINGS_LOCK.ENABLED: false` in `config.js` to switch the lock off entirely.
- Honest limit: this is a **client-side deterrent**, not real authentication — see §6.

### 5.2 Protecting complaint deletion (admin only)

Registered complaints should never disappear by accident, so deletion is restricted:

- Clicking the **delete icon** (complaints table or detail view) first opens a **"Deletion restricted"** dialog asking for the **admin password**.
- Wrong password → *"Wrong password. Deletion is not allowed."* — the complaint is untouched.
- Correct password → the usual **type `DELETE`** confirmation appears as the second step.
- Staff can register, edit and update complaints normally — they simply cannot delete them.
- Configuration lives in `config.js` → `DELETE_PROTECTION`:
  - `ENABLED: true / false` — switch the protection on or off,
  - `PASSWORD: ""` — empty (default) reuses the Settings lock password (`SETTINGS_LOCK.PASSWORD`); set a different one here if you want separate passwords.
- Honest limit: same as §5.1 — client-side control, not real authentication (see §6).

**Status definitions used by the statistics**

- *Open* = status New, Assigned to Branch, Under Investigation or Waiting for Customer.
- *Resolved* = Resolved + Closed.
- *Overdue* = open complaint whose follow-up due date is in the past.
- *Waiting for branch response* = status **Assigned to Branch**.
- *Waiting for customer response* = status **Waiting for Customer**.
- *Average resolution time* = mean of (resolved-at − received) over complaints that have a resolution timestamp.

---

## 6. Security limitations (please read)

A static website + Apps Script Web App is a great free stack, but you must understand its limits:

- **The endpoint is public.** A Web App deployed with *Who has access: Anyone* can be called by **anyone who obtains the URL** — they could read or overwrite complaint data. Keep the URL private (share it only with authorised coordinators, do not post it publicly).
- **A shared secret in the frontend is NOT secure.** Any token stored in `config.js` or `script.js` is visible in the browser page source. Such a "password" is at best a mild deterrent — never treat it as real authentication. (This is why this project does not pretend otherwise.)
- **The Settings lock follows the same rule.** The `SETTINGS_LOCK` password in `config.js` stops casual staff from changing the connection or clearing data, but a technical person can read the password or bypass the lock in the browser. Treat it as accident protection, not security.
- **No per-user authentication or audit of who logged in.** Static hosting cannot provide real login. The "Your name" field in Settings is recorded in history entries but is self-declared, not verified.
- **Practical mitigations**
  - Keep the GitHub Pages URL and the Apps Script URL internal; do not publish them.
  - Store the data in a company-owned Google account; the sheet's revision history (`File → Version history`) lets you roll back vandalism.
  - Complaint data contains personal data (names, phone numbers) — treat it according to UAE PDPL / your company's privacy policy.
  - If you later need public customer-facing submissions, use a Google Form instead of exposing the same API.
- **Editing the sheet by hand** is possible but keep the *History* column as valid JSON or leave it untouched, and do not reorder/rename columns.

---

## 7. Data model

Complaint record (one row in the **Complaints** tab, one JSON object in exports):

`id, dateTime, source, branch, orderNumber, orderDateTime, category, priority, description, deliveryPlatform, customerName, customerPhone, reviewUrl, reportedBy, callbackRequired, branchContact, followUpDate, status, resolution, resolvedAt, history[], createdAt, updatedAt`

- `id` — generated by the Apps Script server (`HPB-00001` format). In Demo Mode it is generated locally.
- `history[]` — audit trail: registration, status changes, assignments, follow-ups, notes, edits, reopenings (each with timestamp and user name).
- Branches live in the **Branches** tab: `name, contact, phone, active`.

**Backups:** Settings → *Export backup (JSON)* downloads everything (complaints + branches). The Google Sheet itself is also a full copy — use Google's version history for recovery.

**Demo vs real data:** the demo dataset lives in `demo-data.js` only. It is loaded exclusively while the app is in Demo Mode and is stored under separate localStorage keys. Connecting the Google Sheet never imports demo records, and demo tools are disabled in Live Mode.

---

## 8. Troubleshooting

| Problem | Fix |
| --- | --- |
| "Unexpected response from the Web App" | Make sure the URL ends with `/exec` (not `/dev`), and the deployment access is **Anyone**. Redeploy if needed. |
| Changes to `google-apps-script.gs` have no effect | Create a **new version** (Deploy → Manage deployments → edit). |
| Connection works in browser test but not from the site | Re-authorise the Apps Script project; check *Execute as: Me*. |
| Wrong times shown | Check the spreadsheet's time zone (**File → Settings**) — ideally set to Dubai (GMT+4). |
| Duplicate complaint IDs | Avoid manual row insertion; let the app (or the server) generate IDs. |
| Charts are empty | Chart.js CDN blocked — check the network, or continue without charts (everything else works). |
| Want to reset the demo | Settings → *Clear all data (demo mode)*, then *Load demo dataset*. |

---

*Huff & Puff Burger — Complaint Management System v1.3.0 · static site + Google Sheets backend · built for free hosting on GitHub Pages.*
