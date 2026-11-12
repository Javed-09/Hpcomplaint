/* ============================================================================
   HUFF & PUFF BURGER — Complaint Management System
   config.js  —  THE ONLY FILE YOU NEED TO EDIT
   ----------------------------------------------------------------------------
   1) To connect the shared Google Sheets database, paste your Google Apps
      Script Web App URL into APPS_SCRIPT_URL below (see README.md).
      Example: "https://script.google.com/macros/s/AKfycb.../exec"
   2) If APPS_SCRIPT_URL is empty, the site runs in clearly-labelled DEMO MODE
      (data saved in this browser's localStorage only — it does NOT sync
      between computers or users).
   ============================================================================ */

const HPB_CONFIG = {

  /* ▶▶ PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL BETWEEN THESE QUOTES ◀◀ */
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz-KUXtuFyjuUz-bewbNmU9N0Nm8-2LBe2KCyKmCJA4WGJznanq7OOuzhRt_LKb6xSq/exec",

  /* Branding ------------------------------------------------------------- */
  BRAND_NAME: "Huff & Puff Burger",
  BRAND_SHORT: "HPB",
  SYSTEM_NAME: "Complaint Management",
  VERSION: "1.3.0",

  /* A new follow-up date is pre-filled this many days ahead on the form --- */
  DEFAULT_FOLLOWUP_DAYS: 3,

  /* Settings page lock ----------------------------------------------------
     When ENABLED is true, the Settings page asks for the PASSWORD below
     before it opens. This protects the database URL and the data tools
     (connect / disconnect / clear data) from accidental or casual use.

     ⚠ HONEST SECURITY NOTE: this is a client-side lock only. It is a good
     deterrent for everyday staff, but it is NOT real security — a technical
     person can read this password in this file or bypass it in the browser.
     A plain static website cannot provide true password protection. Keep
     the site URL (and this file) shared only with trusted staff, and see
     README.md §6 "Security limitations" for the full picture. ------------ */
  SETTINGS_LOCK: {
    ENABLED: false,
    PASSWORD: "hpb-admin"          /* ← CHANGE THIS before going live */
  },

  /* Site login -------------------------------------------------------------
     When ENABLED is true, the whole website opens with a sign-in screen:
     nobody sees any complaints until they enter the PASSWORD below.
     Staff only need ONE shared password (there are no individual accounts —
     that would need a real user database).

     • Tick "Keep me signed in" on your own trusted computer to skip the
       login next time. Use the "Log out" button (top bar) on shared PCs.
     • The Settings lock (below) stays active on top of this — after login,
       Settings still asks for ITS password.

     ⚠ HONEST SECURITY NOTE: this is a client-side login. It comfortably
     stops casual staff from opening the site, but it is NOT bank-grade
     security — a technical person can read this password in this file.
     That is the honest limit of a free static website. See README.md §6.
     ----------------------------------------------------------------------- */
  LOGIN: {
    ENABLED: true,
    PASSWORD: "hpb-admin",         /* ← CHANGE THIS before going live */
    REMEMBER_DEVICE: true          /* show the "Keep me signed in" checkbox */
  },

  /* Complaint deletion protection ------------------------------------------
     When ENABLED is true, deleting a complaint first asks for the admin
     password. Staff can register and update complaints, but only you (with
     the password) can delete them. A complaint stays in the database and
     the statistics once registered.

     PASSWORD: leave "" to reuse the Settings lock password above, or set
     a separate password here if you prefer.

     Same honest note as above: client-side control, not real security —
     see README.md §6. ---------------------------------------------------- */
  DELETE_PROTECTION: {
    ENABLED: true,
    PASSWORD: ""                   /* "" = use the SETTINGS_LOCK password */
  },

  /* Initial branches (13 of 15 pre-loaded).
     Add the remaining 2 branches in Branch Management (or directly in the
     Google Sheet "Branches" tab after connecting). ----------------------- */
  BRANCHES: [
    { name: "Muroor",   contact: "", phone: "", active: true },
    { name: "Jumeirah", contact: "", phone: "", active: true },
    { name: "Khalifa",  contact: "", phone: "", active: true },
    { name: "Rabdan",   contact: "", phone: "", active: true },
    { name: "Falah",    contact: "", phone: "", active: true },
    { name: "Ajman",    contact: "", phone: "", active: true },
    { name: "Sharjah",  contact: "", phone: "", active: true },
    { name: "Fujairah", contact: "", phone: "", active: true },
    { name: "Shahama",  contact: "", phone: "", active: true },
    { name: "Baniyas",  contact: "", phone: "", active: true },
    { name: "RAK",      contact: "", phone: "", active: true },
    { name: "Zakher",   contact: "", phone: "", active: true },
    { name: "Al Ain",   contact: "", phone: "", active: true }
  ],

  /* Fixed option lists ---------------------------------------------------- */
  SOURCES: [
    "Call Centre", "WhatsApp", "Instagram", "Facebook",
    "Google Review", "Email", "Branch", "Other"
  ],

  CATEGORIES: [
    "Food Quality", "Late Delivery", "Missing Items", "Wrong Order",
    "Staff Behaviour", "Packaging", "Payment", "Refund",
    "Customer Service", "Other"
  ],

  PRIORITIES: ["Normal", "High", "Urgent"],

  STATUSES: [
    "New", "Assigned to Branch", "Under Investigation",
    "Waiting for Customer", "Resolved", "Closed"
  ],

  DELIVERY_PLATFORMS: [
    "Not applicable", "Talabat", "Deliveroo", "Careem",
    "Noon", "Zomato", "In-store", "Other"
  ],

  /* When true and no APPS_SCRIPT_URL is configured, the site falls back to
     a clearly-labelled demo mode instead of showing a connection error. --- */
  ALLOW_DEMO_MODE: true
};

/* Make the config available globally (plain script, no modules — so the site
   also works when opened directly from the file system or GitHub Pages). --- */
window.HPB_CONFIG = HPB_CONFIG;
