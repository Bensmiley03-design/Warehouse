// Pokemon Card Tracker — data store
// Plain JS, no JSX. Loaded BEFORE the React app.
//
// State shape (v4):
//   {
//     schemaVersion: 4,
//     activeWorkspaceId: "w1",
//     workspaces: [
//       {
//         id, name,
//         cards: [], events: [], expenses: [], snapshots: [], session: null,
//         gsheetUrl: "", lastSyncedAt: null, lastSyncDirection: null,
//       },
//     ],
//     settings: {
//       businessName, googleClientId, demoCleared, demoDismissed,
//     },
//   }
//
// PCT's public API operates on the ACTIVE workspace. getState() returns the
// active workspace flattened with global settings merged, so existing screens
// keep working without changes.

(function () {
  const STORAGE_KEY = "pct.v4";
  const EXCEL_EPOCH = Date.UTC(1899, 11, 30); // Excel serial -> JS ms

  // ---------- date helpers ----------
  function fromExcelSerial(n) {
    if (n == null || n === "") return null;
    return new Date(EXCEL_EPOCH + Number(n) * 86400000).toISOString().slice(0, 10);
  }
  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }
  function iso(y, m, d) {
    return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
  }

  // ---------- seed (demo inventory) ----------
  const SEED_CARDS = [
    // ----- Dec 2025 -----
    { id: "c01", date: iso(2025,12,3),  name: "Scarlet & Violet Booster Box",                 qty: 1,  paid: 115, status: "",           dateOut: null,           gotBack: null, notes: "Holding for spring shows",                 event: null },
    { id: "c02", date: iso(2025,12,15), name: "Charizard ex 199/197 (Obsidian Flames)",       qty: 1,  paid: 78,  status: "Sold",       dateOut: iso(2026,1,15), gotBack: 135,  notes: "Sold at Atlanta con table",                event: "Atlanta Con" },
    { id: "c03", date: iso(2025,12,20), name: "Pokemon 151 Elite Trainer Box",                qty: 3,  paid: 165, status: "Sold",       dateOut: iso(2026,1,15), gotBack: 240,  notes: "All three ETBs gone at Atlanta",           event: "Atlanta Con" },

    // ----- Jan 2026 -----
    { id: "c04", date: iso(2026,1,4),   name: "Pikachu VMAX Rainbow 188/185",                 qty: 1,  paid: 215, status: "Sold",       dateOut: iso(2026,1,15), gotBack: 260,  notes: "Repeat customer at Atlanta",               event: "Atlanta Con" },
    { id: "c05", date: iso(2026,1,10),  name: "Paldea Evolved Booster Packs",                 qty: 24, paid: 108, status: "Sold",       dateOut: iso(2026,1,15), gotBack: 168,  notes: "Pack-rip table, $7/pack",                  event: "Atlanta Con" },
    { id: "c06", date: iso(2026,1,10),  name: "Pack giveaways — Atlanta",                     qty: 8,  paid: 32,  status: "Given Away", dateOut: iso(2026,1,15), gotBack: null, notes: "Free packs for kids at the booth",         event: "Atlanta Con" },
    { id: "c07", date: iso(2026,1,22),  name: "Obsidian Flames Booster Box",                  qty: 1,  paid: 112, status: "",           dateOut: null,           gotBack: null, notes: "Pickup from local LGS",                    event: null },
    { id: "c08", date: iso(2026,1,28),  name: "Paradox Rift Elite Trainer Box",               qty: 2,  paid: 90,  status: "Sold",       dateOut: iso(2026,2,21), gotBack: 130,  notes: "Charlotte show",                           event: "Charlotte Card Show" },

    // ----- Feb 2026 -----
    { id: "c09", date: iso(2026,2,5),   name: "Iono Special Art 254/193",                     qty: 1,  paid: 95,  status: "Sold",       dateOut: iso(2026,2,21), gotBack: 80,   notes: "Small loss — market softened",             event: "Charlotte Card Show" },
    { id: "c10", date: iso(2026,2,8),   name: "Lost Origin Booster Box",                      qty: 1,  paid: 145, status: "",           dateOut: null,           gotBack: null, notes: "",                                         event: null },
    { id: "c11", date: iso(2026,2,12),  name: "Crown Zenith Elite Trainer Box",               qty: 3,  paid: 135, status: "Sold",       dateOut: iso(2026,2,21), gotBack: 189,  notes: "All three ETBs to one buyer",              event: "Charlotte Card Show" },
    { id: "c12", date: iso(2026,2,18),  name: "Pokemon 151 Booster Bundle",                   qty: 4,  paid: 96,  status: "Sold",       dateOut: iso(2026,2,21), gotBack: 148,  notes: "Bundles moved fast",                       event: "Charlotte Card Show" },
    { id: "c13", date: iso(2026,2,25),  name: "Mew ex 193/165 (151)",                         qty: 1,  paid: 42,  status: "Traded",     dateOut: iso(2026,3,2),  gotBack: 55,   notes: "Traded to Mike R. for Paldean Fates ETBs", event: null },

    // ----- Mar 2026 -----
    { id: "c14", date: iso(2026,3,2),   name: "Paldean Fates Elite Trainer Box",              qty: 4,  paid: 220, status: "",           dateOut: null,           gotBack: null, notes: "From trade with Mike R. (see Mew row)",    event: null },
    { id: "c15", date: iso(2026,3,8),   name: "Temporal Forces Booster Box",                  qty: 2,  paid: 230, status: "",           dateOut: null,           gotBack: null, notes: "Hot set — holding for Dallas",             event: null },
    { id: "c16", date: iso(2026,3,15),  name: "Charizard 199/165 (151)",                      qty: 1,  paid: 68,  status: "Sold",       dateOut: iso(2026,3,28), gotBack: 115,  notes: "Quick flip at Dallas",                     event: "Dallas Cardposium" },
    { id: "c17", date: iso(2026,3,18),  name: "Paradox Rift Booster Box",                     qty: 1,  paid: 108, status: "",           dateOut: null,           gotBack: null, notes: "",                                         event: null },
    { id: "c18", date: iso(2026,3,22),  name: "Surging Sparks Booster Packs",                 qty: 40, paid: 160, status: "Sold",       dateOut: iso(2026,3,28), gotBack: 260,  notes: "Pack-rip table — moved them all",          event: "Dallas Cardposium" },
    { id: "c19", date: iso(2026,3,28),  name: "Pack giveaways — Dallas",                      qty: 12, paid: 42,  status: "Given Away", dateOut: iso(2026,3,28), gotBack: null, notes: "Free packs for kids",                      event: "Dallas Cardposium" },

    // ----- Apr 2026 -----
    { id: "c20", date: iso(2026,4,2),   name: "Twilight Masquerade Elite Trainer Box",        qty: 3,  paid: 135, status: "Sold",       dateOut: iso(2026,4,25), gotBack: 195,  notes: "Tampa Trade Day",                          event: "Tampa Trade Day" },
    { id: "c21", date: iso(2026,4,5),   name: "Latias ex Special Art 199/167",                qty: 1,  paid: 58,  status: "Sold",       dateOut: iso(2026,4,25), gotBack: 92,   notes: "Tampa — first sale of the day",            event: "Tampa Trade Day" },
    { id: "c22", date: iso(2026,4,10),  name: "Roaring Moon ex Special Art 251/182",          qty: 1,  paid: 48,  status: "Keeping",    dateOut: null,           gotBack: null, notes: "Pulled it for my personal binder",         event: null },
    { id: "c23", date: iso(2026,4,15),  name: "Shrouded Fable Booster Box",                   qty: 1,  paid: 135, status: "",           dateOut: null,           gotBack: null, notes: "",                                         event: null },
    { id: "c24", date: iso(2026,4,20),  name: "Twilight Masquerade Booster Bundle",           qty: 5,  paid: 115, status: "Sold",       dateOut: iso(2026,4,25), gotBack: 175,  notes: "Bundles sold out at Tampa",                event: "Tampa Trade Day" },
    { id: "c25", date: iso(2026,4,25),  name: "Pack giveaways — Tampa",                       qty: 10, paid: 35,  status: "Given Away", dateOut: iso(2026,4,25), gotBack: null, notes: "Kids' giveaway booth",                     event: "Tampa Trade Day" },
    { id: "c26", date: iso(2026,4,28),  name: "Stellar Crown Elite Trainer Box",              qty: 2,  paid: 98,  status: "",           dateOut: null,           gotBack: null, notes: "",                                         event: null },

    // ----- May 2026 -----
    { id: "c27", date: iso(2026,5,3),   name: "Surging Sparks Booster Box",                   qty: 1,  paid: 115, status: "",           dateOut: null,           gotBack: null, notes: "",                                         event: null },
    { id: "c28", date: iso(2026,5,6),   name: "Pikachu ex Special Art 232/167",               qty: 1,  paid: 85,  status: "Sold",       dateOut: iso(2026,5,10), gotBack: 148,  notes: "eBay sale, shipped Saturday",              event: null },
    { id: "c29", date: iso(2026,5,8),   name: "Charizard ex Hyper Rare 215/197",              qty: 1,  paid: 148, status: "",           dateOut: null,           gotBack: null, notes: "Holding for Raleigh next week",            event: null },
    { id: "c30", date: iso(2026,5,10),  name: "Bloodmoon Ursaluna ex 216/167",                qty: 1,  paid: 42,  status: "Sold",       dateOut: iso(2026,5,12), gotBack: 68,   notes: "Facebook marketplace local sale",          event: null },
    { id: "c31", date: iso(2026,5,11),  name: "Journey Together Booster Bundle",              qty: 6,  paid: 138, status: "",           dateOut: null,           gotBack: null, notes: "Bringing to Raleigh — bundles always move", event: null },
    { id: "c32", date: iso(2026,5,12),  name: "Terapagos ex 211/162",                         qty: 2,  paid: 64,  status: "",           dateOut: null,           gotBack: null, notes: "Pulled two — keep one, sell one",          event: null },
    { id: "c33", date: iso(2026,5,12),  name: "Gengar ex 169/167 (Surging Sparks)",           qty: 1,  paid: 88,  status: "Sold",       dateOut: iso(2026,5,13), gotBack: 145,  notes: "Instagram DM sale, Zelle",                 event: null },
    { id: "c34", date: iso(2026,5,13),  name: "Pack giveaways — stockpile",                   qty: 6,  paid: 24,  status: "",           dateOut: null,           gotBack: null, notes: "Hand out at Raleigh kids' booth",          event: null },
  ];

  const SEED_EVENTS = [
    { id: "e1", name: "Atlanta Con",          date: iso(2026,1,15),  location: "Atlanta, GA",   tableFee: 120 },
    { id: "e2", name: "Charlotte Card Show",  date: iso(2026,2,21),  location: "Charlotte, NC", tableFee: 80  },
    { id: "e3", name: "Dallas Cardposium",    date: iso(2026,3,28),  location: "Dallas, TX",    tableFee: 150 },
    { id: "e4", name: "Tampa Trade Day",      date: iso(2026,4,25),  location: "Tampa, FL",     tableFee: 90  },
    { id: "e5", name: "Raleigh Convention",   date: iso(2026,5,23),  location: "Raleigh, NC",   tableFee: 110 },
  ];

  const SEED_EXPENSES = [
    { id: "x1", date: iso(2026,1,14), category: "Travel",   amount: 68,  event: "Atlanta Con",         notes: "Gas to Atlanta" },
    { id: "x2", date: iso(2026,1,14), category: "Lodging",  amount: 142, event: "Atlanta Con",         notes: "Hotel night before" },
    { id: "x3", date: iso(2026,2,21), category: "Travel",   amount: 32,  event: "Charlotte Card Show", notes: "Gas to Charlotte" },
    { id: "x4", date: iso(2026,3,27), category: "Lodging",  amount: 168, event: "Dallas Cardposium",   notes: "Hotel Friday + Saturday" },
    { id: "x5", date: iso(2026,3,27), category: "Travel",   amount: 95,  event: "Dallas Cardposium",   notes: "Gas to Dallas (long haul)" },
    { id: "x6", date: iso(2026,3,28), category: "Food",     amount: 42,  event: "Dallas Cardposium",   notes: "Lunch + dinner" },
    { id: "x7", date: iso(2026,4,24), category: "Travel",   amount: 56,  event: "Tampa Trade Day",     notes: "Gas to Tampa" },
    { id: "x8", date: iso(2026,4,8),  category: "Supplies", amount: 38,  event: null,                  notes: "Penny sleeves + toploaders bulk" },
    { id: "x9", date: iso(2026,5,2),  category: "Shipping", amount: 24,  event: null,                  notes: "eBay flat-rate envelopes (50ct)" },
    { id: "x10", date: iso(2026,5,11), category: "Supplies", amount: 46, event: null,                  notes: "Card savers + team bags restock" },
    { id: "x11", date: iso(2026,5,12), category: "Shipping", amount: 18, event: null,                  notes: "PWE shipments — Gengar + Pikachu" },
  ];

  function snapStub(label, date, rowCount, profit) {
    return {
      id: "s_" + label.replace(/\W+/g, "_"),
      date,
      label,
      summary: {
        cardsOnHand: 0, moneyTiedUp: 0, cardsSold: 0,
        profitFromSales: profit, cardsGiven: 0, giveawayCost: 0,
        tradesCount: 0, tradeNet: 0,
      },
      cards: Array(rowCount).fill(null).map((_, i) => ({ id: "snap_" + i })),
    };
  }
  const SEED_SNAPSHOTS = [
    snapStub("Month-end 2026-04", iso(2026,5,1),  26, 308),
    snapStub("Month-end 2026-03", iso(2026,4,1),  18, 192),
    snapStub("Month-end 2026-02", iso(2026,3,1),  12, 117),
    snapStub("Month-end 2026-01", iso(2026,2,1),  6,  82 ),
  ];

  // ---------- workspace + global settings helpers ----------
  // Per-workspace settings keys (each inventory has its own copy)
  const PER_WORKSPACE_SETTINGS = new Set(["gsheetUrl", "lastSyncedAt", "lastSyncDirection"]);

  function newWorkspaceId() {
    return "w" + Math.random().toString(36).slice(2, 9);
  }

  function makeWorkspace({ id, name, cards = [], events = [], expenses = [], snapshots = [], session = null, gsheetUrl = "", lastSyncedAt = null, lastSyncDirection = null }) {
    return {
      id: id || newWorkspaceId(),
      name: name || "Untitled inventory",
      cards, events, expenses, snapshots, session,
      gsheetUrl, lastSyncedAt, lastSyncDirection,
    };
  }

  function defaultState() {
    const ws = makeWorkspace({
      id: "w1",
      name: "The Warehouse",
      cards: SEED_CARDS,
      events: SEED_EVENTS,
      expenses: SEED_EXPENSES,
      snapshots: SEED_SNAPSHOTS,
    });
    return {
      schemaVersion: 4,
      activeWorkspaceId: ws.id,
      workspaces: [ws],
      settings: {
        businessName: "The Warehouse",
        googleClientId: "",
        demoCleared: false,
        demoDismissed: false,
      },
    };
  }

  // Migrate any older / loose state into the v4 shape
  function migrate(raw) {
    if (!raw || typeof raw !== "object") return defaultState();
    if (raw.schemaVersion === 4 && Array.isArray(raw.workspaces)) {
      // Backfill any missing fields
      raw.workspaces.forEach((w) => {
        if (!Array.isArray(w.cards)) w.cards = [];
        if (!Array.isArray(w.events)) w.events = [];
        if (!Array.isArray(w.expenses)) w.expenses = [];
        if (!Array.isArray(w.snapshots)) w.snapshots = [];
        if (typeof w.session === "undefined") w.session = null;
        if (typeof w.gsheetUrl !== "string") w.gsheetUrl = "";
      });
      if (!raw.settings) raw.settings = { businessName: "The Warehouse", googleClientId: "", demoCleared: false, demoDismissed: false };
      if (!raw.activeWorkspaceId || !raw.workspaces.find((w) => w.id === raw.activeWorkspaceId)) {
        raw.activeWorkspaceId = raw.workspaces[0]?.id || null;
      }
      if (raw.workspaces.length === 0) {
        // empty — recreate a default inventory so the app never has zero workspaces
        const ws = makeWorkspace({ id: "w1", name: raw.settings.businessName || "Default", cards: [], events: [], expenses: [], snapshots: [] });
        raw.workspaces.push(ws);
        raw.activeWorkspaceId = ws.id;
      }
      return raw;
    }
    // Legacy single-state shape -> wrap as a single workspace
    const legacySettings = raw.settings || {};
    const ws = makeWorkspace({
      id: "w1",
      name: legacySettings.businessName || "Default inventory",
      cards: raw.cards || [],
      events: raw.events || [],
      expenses: raw.expenses || [],
      snapshots: raw.snapshots || [],
      session: raw.session || null,
      gsheetUrl: legacySettings.gsheetUrl || "",
      lastSyncedAt: legacySettings.lastSyncedAt || null,
      lastSyncDirection: legacySettings.lastSyncDirection || null,
    });
    return {
      schemaVersion: 4,
      activeWorkspaceId: ws.id,
      workspaces: [ws],
      settings: {
        businessName: legacySettings.businessName || "The Warehouse",
        googleClientId: legacySettings.googleClientId || "",
        demoCleared: !!legacySettings.demoCleared,
        demoDismissed: !!legacySettings.demoDismissed,
      },
    };
  }

  // ---------- persistence ----------
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return migrate(JSON.parse(raw));
      // Try the v3 / v2 keys to migrate one-time
      for (const oldKey of ["pct.v3", "pct.v2"]) {
        const legacy = localStorage.getItem(oldKey);
        if (legacy) {
          const migrated = migrate(JSON.parse(legacy));
          save(migrated);
          return migrated;
        }
      }
    } catch (e) {}
    const init = defaultState();
    save(init);
    return init;
  }
  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = load();
  const listeners = new Set();
  function emit() {
    state = { ...state };
    save(state);
    listeners.forEach((fn) => fn(getState()));
  }

  // ---------- workspace accessors ----------
  function active() {
    return state.workspaces.find((w) => w.id === state.activeWorkspaceId) || state.workspaces[0];
  }
  function activeIndex() {
    return state.workspaces.findIndex((w) => w.id === state.activeWorkspaceId);
  }
  function patchActive(patch) {
    const i = activeIndex();
    if (i < 0) return;
    state.workspaces[i] = { ...state.workspaces[i], ...patch };
  }

  // Public state shape (flattened active workspace + merged settings)
  function getState() {
    const w = active();
    return {
      // Active workspace data (flat — like legacy)
      cards: w.cards,
      events: w.events,
      expenses: w.expenses,
      snapshots: w.snapshots,
      session: w.session,
      // Merged settings (global + per-workspace sync)
      settings: {
        ...state.settings,
        gsheetUrl: w.gsheetUrl || "",
        lastSyncedAt: w.lastSyncedAt || null,
        lastSyncDirection: w.lastSyncDirection || null,
      },
      // Workspace meta
      workspaces: state.workspaces.map((x) => ({
        id: x.id,
        name: x.name,
        cardCount: (x.cards || []).filter((c) => c.name && !c.status).length,
        totalRows: (x.cards || []).length,
      })),
      activeWorkspaceId: w.id,
      activeWorkspaceName: w.name,
    };
  }

  // ---------- selectors / derived ----------
  function profit(card) {
    if (!card.status || card.status === "Keeping") return null;
    const got = card.gotBack == null ? 0 : Number(card.gotBack);
    const paid = card.paid == null ? 0 : Number(card.paid);
    return got - paid;
  }
  function isOnHand(card) {
    return !card.status && !!card.name;
  }
  function summary() {
    const w = active();
    const cards = w.cards;
    const onHand = cards.filter(isOnHand);
    const sold = cards.filter((c) => c.status === "Sold");
    const given = cards.filter((c) => c.status === "Given Away");
    const traded = cards.filter((c) => c.status === "Traded");
    const sum = (arr, key) => arr.reduce((a, c) => a + (Number(c[key]) || 0), 0);
    const revenue = sold.reduce((a, c) => a + (Number(c.gotBack) || 0), 0);
    const cogs = sum(sold, "paid");
    const profitFromSales = revenue - cogs;
    const expenses = (w.expenses || []).reduce((a, x) => a + (Number(x.amount) || 0), 0);
    const margin = revenue > 0 ? (profitFromSales / revenue) * 100 : 0;
    return {
      cardsOnHand: sum(onHand, "qty"),
      moneyTiedUp: sum(onHand, "paid"),
      cardsSold: sum(sold, "qty"),
      revenue,
      cogs,
      profitFromSales,
      cardsGiven: sum(given, "qty"),
      giveawayCost: sum(given, "paid"),
      tradesCount: traded.length,
      tradeNet: traded.reduce((a, c) => a + (profit(c) || 0), 0),
      expenses,
      netProfit: profitFromSales - expenses,
      margin,
    };
  }

  // ---------- mutations (active workspace) ----------
  function addCard(input) {
    const w = active();
    const id = "c" + Math.random().toString(36).slice(2, 9);
    w.cards.unshift({
      id,
      date: input.date || todayISO(),
      name: input.name || "",
      qty: Number(input.qty) || 1,
      paid: input.paid === "" || input.paid == null ? 0 : Number(input.paid),
      status: input.status || "",
      dateOut: input.dateOut || null,
      gotBack: input.gotBack === "" || input.gotBack == null ? null : Number(input.gotBack),
      notes: input.notes || "",
      event: input.event || null,
    });
    emit();
    return id;
  }
  function updateCard(id, patch) {
    const w = active();
    const i = w.cards.findIndex((c) => c.id === id);
    if (i < 0) return;
    w.cards[i] = { ...w.cards[i], ...patch };
    emit();
  }
  function deleteCard(id) {
    const w = active();
    w.cards = w.cards.filter((c) => c.id !== id);
    patchActive({ cards: w.cards });
    emit();
  }
  function addEvent(input) {
    const w = active();
    const id = "e" + Math.random().toString(36).slice(2, 9);
    w.events.unshift({
      id,
      name: input.name || "Untitled event",
      date: input.date || todayISO(),
      location: input.location || "",
      tableFee: Number(input.tableFee) || 0,
    });
    emit();
    return id;
  }
  function updateEvent(id, patch) {
    const w = active();
    const i = w.events.findIndex((e) => e.id === id);
    if (i < 0) return;
    w.events[i] = { ...w.events[i], ...patch };
    emit();
  }
  function deleteEvent(id) {
    const w = active();
    const removed = w.events.find((e) => e.id === id);
    w.events = w.events.filter((e) => e.id !== id);
    if (removed) {
      w.cards.forEach((c) => { if (c.event === removed.name) c.event = null; });
    }
    patchActive({ events: w.events, cards: w.cards });
    emit();
  }
  function snapshot(label) {
    const w = active();
    const snap = {
      id: "s" + Math.random().toString(36).slice(2, 9),
      date: todayISO(),
      label: label || "Month-end " + todayISO().slice(0, 7),
      summary: summary(),
      cards: JSON.parse(JSON.stringify(w.cards)),
    };
    w.snapshots.unshift(snap);
    emit();
    return snap.id;
  }
  function deleteSnapshot(id) {
    const w = active();
    w.snapshots = w.snapshots.filter((s) => s.id !== id);
    patchActive({ snapshots: w.snapshots });
    emit();
  }
  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    state = load();
    emit();
  }
  function clearAll() {
    // Wipe the ACTIVE workspace's data only (keep other inventories intact).
    patchActive({ cards: [], events: [], expenses: [], snapshots: [], session: null });
    state.settings = { ...state.settings, demoCleared: true };
    emit();
  }
  function importCards(rows) {
    const w = active();
    rows.forEach((r) => w.cards.push(r));
    emit();
  }
  function updateSettings(patch) {
    // Route each key to per-workspace or global settings
    const wsPatch = {};
    const gPatch = {};
    Object.entries(patch).forEach(([k, v]) => {
      if (PER_WORKSPACE_SETTINGS.has(k)) wsPatch[k] = v;
      else gPatch[k] = v;
    });
    if (Object.keys(wsPatch).length) patchActive(wsPatch);
    if (Object.keys(gPatch).length) state.settings = { ...state.settings, ...gPatch };
    emit();
  }
  function replaceAll({ cards, events }) {
    patchActive({ cards, events });
    emit();
  }

  // ---------- expenses ----------
  function addExpense(input) {
    const w = active();
    const id = "x" + Math.random().toString(36).slice(2, 9);
    w.expenses = w.expenses || [];
    w.expenses.unshift({
      id,
      date: input.date || todayISO(),
      category: input.category || "Other",
      amount: Number(input.amount) || 0,
      event: input.event || null,
      notes: input.notes || "",
    });
    emit();
    return id;
  }
  function updateExpense(id, patch) {
    const w = active();
    w.expenses = w.expenses || [];
    const i = w.expenses.findIndex((x) => x.id === id);
    if (i < 0) return;
    w.expenses[i] = { ...w.expenses[i], ...patch };
    emit();
  }
  function deleteExpense(id) {
    const w = active();
    w.expenses = (w.expenses || []).filter((x) => x.id !== id);
    patchActive({ expenses: w.expenses });
    emit();
  }

  // ---------- show mode (per-workspace session) ----------
  function startShow(eventName) {
    patchActive({ session: { event: eventName, startedAt: new Date().toISOString() } });
    emit();
  }
  function endShow() {
    const w = active();
    const session = w.session;
    patchActive({ session: null });
    emit();
    return session;
  }
  function getSession() { return active().session; }

  function sessionStats() {
    const w = active();
    if (!w.session) return null;
    const eventName = w.session.event;
    const started = w.session.startedAt;
    const startedDay = started.slice(0, 10);
    const onOrAfter = (d) => d && d >= startedDay;
    const cardsSoldNow = w.cards.filter((c) =>
      c.event === eventName && c.status === "Sold" && onOrAfter(c.dateOut)
    );
    const added = w.cards.filter((c) =>
      c.event === eventName && onOrAfter(c.date)
    );
    const revenue = cardsSoldNow.reduce((a, c) => a + (Number(c.gotBack) || 0), 0);
    const cogs    = cardsSoldNow.reduce((a, c) => a + (Number(c.paid) || 0), 0);
    return {
      event: eventName,
      startedAt: started,
      cardsSold: cardsSoldNow.reduce((a, c) => a + (Number(c.qty) || 0), 0),
      cardsAdded: added.length,
      revenue,
      profit: revenue - cogs,
      margin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
    };
  }

  function basisPerHit(total, hits) {
    const t = Number(total) || 0;
    const h = Number(hits) || 0;
    if (h <= 0) return 0;
    return t / h;
  }

  function eventPL(eventName) {
    const w = active();
    const linked = w.cards.filter((c) => c.event === eventName);
    const sold = linked.filter((c) => c.status === "Sold");
    const given = linked.filter((c) => c.status === "Given Away");
    const revenue = sold.reduce((a, c) => a + (Number(c.gotBack) || 0), 0);
    const cogs = sold.reduce((a, c) => a + (Number(c.paid) || 0), 0);
    const giveawayCost = given.reduce((a, c) => a + (Number(c.paid) || 0), 0);
    const ev = w.events.find((e) => e.name === eventName);
    const fee = ev ? Number(ev.tableFee) || 0 : 0;
    const otherExpenses = (w.expenses || [])
      .filter((x) => x.event === eventName)
      .reduce((a, x) => a + (Number(x.amount) || 0), 0);
    const grossProfit = revenue - cogs;
    const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    return {
      cards: linked,
      cardsSold: sold.reduce((a, c) => a + (Number(c.qty) || 0), 0),
      revenue, cogs, grossProfit,
      tableFee: fee,
      giveawayCost, otherExpenses,
      netProfit: grossProfit - fee - giveawayCost - otherExpenses,
      margin,
    };
  }

  function monthlyProfit(monthsBack = 6) {
    const w = active();
    const buckets = {};
    const now = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = d.toISOString().slice(0, 7);
      buckets[k] = 0;
    }
    w.cards.forEach((c) => {
      if (c.status === "Sold" && c.dateOut) {
        const k = c.dateOut.slice(0, 7);
        if (k in buckets) buckets[k] += profit(c) || 0;
      }
    });
    return Object.entries(buckets).map(([month, value]) => ({ month, value }));
  }

  function bestSellers(limit = 5) {
    const w = active();
    const sold = w.cards.filter((c) => c.status === "Sold");
    return [...sold]
      .map((c) => ({ ...c, profit: profit(c) }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
  }

  // ---------- workspace management ----------
  function listWorkspaces() {
    return state.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      isActive: w.id === state.activeWorkspaceId,
      cardsOnHand: (w.cards || []).filter((c) => c.name && !c.status).length,
      totalRows: (w.cards || []).length,
      gsheetUrl: w.gsheetUrl || "",
      lastSyncedAt: w.lastSyncedAt || null,
    }));
  }
  function createWorkspace({ name, gsheetUrl } = {}) {
    const ws = makeWorkspace({
      name: (name || "").trim() || "Untitled inventory",
      gsheetUrl: gsheetUrl || "",
    });
    state.workspaces.push(ws);
    state.activeWorkspaceId = ws.id;
    emit();
    return ws.id;
  }
  function renameWorkspace(id, name) {
    const i = state.workspaces.findIndex((w) => w.id === id);
    if (i < 0) return;
    state.workspaces[i] = { ...state.workspaces[i], name: (name || "").trim() || state.workspaces[i].name };
    emit();
  }
  function deleteWorkspace(id) {
    if (state.workspaces.length <= 1) return false; // never delete the last one
    state.workspaces = state.workspaces.filter((w) => w.id !== id);
    if (state.activeWorkspaceId === id) {
      state.activeWorkspaceId = state.workspaces[0].id;
    }
    emit();
    return true;
  }
  function switchWorkspace(id) {
    if (!state.workspaces.find((w) => w.id === id)) return;
    state.activeWorkspaceId = id;
    emit();
  }

  // ---------- subscribe ----------
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // ---------- CSV export ----------
  function exportCSV() {
    const w = active();
    const headers = ["Date", "Card", "Qty", "Paid", "Status", "Date Out", "Got Back", "Profit", "Event", "Notes"];
    const rows = w.cards.map((c) => [
      c.date || "",
      c.name || "",
      c.qty || 0,
      c.paid ?? "",
      c.status || "",
      c.dateOut || "",
      c.gotBack ?? "",
      profit(c) ?? "",
      c.event || "",
      (c.notes || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => (/[,"\n]/.test(String(v)) ? `"${v}"` : v)).join(","))
      .join("\n");
    return csv;
  }
  function downloadCSV(label) {
    const blob = new Blob([exportCSV()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (active().name || "inventory").replace(/[^\w-]+/g, "-").toLowerCase();
    a.download = (label || safeName) + "-" + todayISO() + ".csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // expose
  window.PCT = {
    getState,
    subscribe,
    summary,
    profit,
    isOnHand,
    addCard,
    updateCard,
    deleteCard,
    addEvent,
    updateEvent,
    deleteEvent,
    snapshot,
    deleteSnapshot,
    resetAll,
    clearAll,
    importCards,
    updateSettings,
    replaceAll,
    addExpense,
    updateExpense,
    deleteExpense,
    startShow,
    endShow,
    getSession,
    sessionStats,
    basisPerHit,
    eventPL,
    monthlyProfit,
    bestSellers,
    exportCSV,
    downloadCSV,
    todayISO,
    fromExcelSerial,
    // workspaces
    listWorkspaces,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
    switchWorkspace,
  };
})();
