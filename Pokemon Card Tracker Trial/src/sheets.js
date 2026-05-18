/* Google Sheets sync layer for The Warehouse.
   Uses Google Identity Services (GIS) for OAuth and the Sheets v4 REST API.
   Access tokens live in memory only — user re-connects each session, which
   is the recommended OAuth flow for client-side apps. */
(function () {
  const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

  // Header rows for the two sheets we manage.
  const CARDS_HEADERS = ["ID", "Date", "Card", "Qty", "Paid", "Status", "Date Out", "Got Back", "Profit", "Event", "Notes"];
  const EVENTS_HEADERS = ["ID", "Name", "Date", "Location", "Table Fee"];

  let accessToken = null;
  let tokenClient = null;
  let gsiLoaded = false;
  let gsiLoading = null;

  // ---------- url parsing ----------
  function parseSheetId(url) {
    if (!url) return null;
    const m = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : null;
  }

  // ---------- GIS loader ----------
  function loadGSI() {
    if (gsiLoaded) return Promise.resolve();
    if (gsiLoading) return gsiLoading;
    gsiLoading = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        existing.addEventListener("load", () => { gsiLoaded = true; resolve(); });
        existing.addEventListener("error", reject);
        return;
      }
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = () => { gsiLoaded = true; resolve(); };
      s.onerror = () => reject(new Error("Couldn't load Google sign-in. Check your internet connection."));
      document.head.appendChild(s);
    });
    return gsiLoading;
  }

  // ---------- auth ----------
  async function connect(clientId) {
    if (!clientId) throw new Error("Paste your Google Client ID first (see setup steps).");
    await loadGSI();
    if (!window.google || !google.accounts || !google.accounts.oauth2) {
      throw new Error("Google sign-in didn't initialize. Reload the page and try again.");
    }
    return new Promise((resolve, reject) => {
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPE,
          callback: (resp) => {
            if (resp.error) {
              reject(new Error("Sign-in was cancelled or denied: " + resp.error));
              return;
            }
            accessToken = resp.access_token;
            resolve({ token: accessToken });
          },
          error_callback: (err) => {
            reject(new Error(err && err.message ? err.message : "Sign-in failed."));
          },
        });
        tokenClient.requestAccessToken({ prompt: "" });
      } catch (e) {
        reject(e);
      }
    });
  }

  function disconnect() {
    if (accessToken && window.google && google.accounts && google.accounts.oauth2) {
      try { google.accounts.oauth2.revoke(accessToken, () => {}); } catch (e) {}
    }
    accessToken = null;
  }

  function isConnected() { return !!accessToken; }

  // ---------- API helpers ----------
  async function api(path, opts = {}) {
    if (!accessToken) throw new Error("Not connected. Click Connect first.");
    const url = "https://sheets.googleapis.com/v4/spreadsheets" + path;
    const resp = await fetch(url, {
      ...opts,
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
    });
    if (!resp.ok) {
      let detail = "";
      try {
        const body = await resp.json();
        detail = body?.error?.message || JSON.stringify(body);
      } catch (e) { detail = await resp.text(); }
      if (resp.status === 401) {
        accessToken = null;
        throw new Error("Session expired. Click Connect again.");
      }
      if (resp.status === 403) {
        throw new Error("Permission denied. Make sure the Sheets API is enabled in your Google Cloud project, and that you're signed in as someone with edit access to the sheet. (" + detail + ")");
      }
      if (resp.status === 404) {
        throw new Error("Sheet not found. Double-check the URL. (" + detail + ")");
      }
      throw new Error("Google Sheets error " + resp.status + ": " + detail);
    }
    return resp.json();
  }

  // ---------- sheet management ----------
  async function getSheetTabs(sheetId) {
    const data = await api("/" + sheetId + "?fields=sheets.properties");
    return (data.sheets || []).map((s) => s.properties);
  }

  async function ensureTabs(sheetId) {
    const props = await getSheetTabs(sheetId);
    const have = new Set(props.map((p) => p.title));
    const toAdd = [];
    if (!have.has("Cards"))  toAdd.push({ addSheet: { properties: { title: "Cards" } } });
    if (!have.has("Events")) toAdd.push({ addSheet: { properties: { title: "Events" } } });
    if (toAdd.length) {
      await api("/" + sheetId + ":batchUpdate", {
        method: "POST",
        body: JSON.stringify({ requests: toAdd }),
      });
    }
  }

  async function writeRange(sheetId, range, values) {
    return api("/" + sheetId + "/values/" + encodeURIComponent(range) + "?valueInputOption=USER_ENTERED", {
      method: "PUT",
      body: JSON.stringify({ values }),
    });
  }
  async function clearRange(sheetId, range) {
    return api("/" + sheetId + "/values/" + encodeURIComponent(range) + ":clear", {
      method: "POST",
      body: "{}",
    });
  }
  async function readRange(sheetId, range) {
    const data = await api("/" + sheetId + "/values/" + encodeURIComponent(range));
    return data.values || [];
  }

  // ---------- bulk push / pull ----------
  function cardToRow(c) {
    const paid = c.paid == null ? "" : Number(c.paid);
    const got = c.gotBack == null ? "" : Number(c.gotBack);
    const profit = (!c.status || c.status === "Keeping") ? "" :
      (got === "" ? 0 : got) - (paid === "" ? 0 : paid);
    return [
      c.id || "",
      c.date || "",
      c.name || "",
      c.qty || 0,
      paid,
      c.status || "",
      c.dateOut || "",
      got,
      profit,
      c.event || "",
      c.notes || "",
    ];
  }
  function rowToCard(r) {
    const v = (i) => (r[i] == null ? "" : r[i]);
    return {
      id: v(0) || ("c" + Math.random().toString(36).slice(2, 9)),
      date: v(1) || null,
      name: v(2) || "",
      qty: Number(v(3)) || 0,
      paid: v(4) === "" ? 0 : Number(v(4)),
      status: v(5) || "",
      dateOut: v(6) || null,
      gotBack: v(7) === "" ? null : Number(v(7)),
      notes: v(10) || "",
      event: v(9) || null,
    };
  }
  function eventToRow(e) {
    return [e.id || "", e.name || "", e.date || "", e.location || "", Number(e.tableFee) || 0];
  }
  function rowToEvent(r) {
    const v = (i) => (r[i] == null ? "" : r[i]);
    return {
      id: v(0) || ("e" + Math.random().toString(36).slice(2, 9)),
      name: v(1) || "",
      date: v(2) || null,
      location: v(3) || "",
      tableFee: Number(v(4)) || 0,
    };
  }

  async function initialize(sheetId) {
    await ensureTabs(sheetId);
    await writeRange(sheetId, "Cards!A1:K1", [CARDS_HEADERS]);
    await writeRange(sheetId, "Events!A1:E1", [EVENTS_HEADERS]);
  }

  async function pushAll(sheetId, state) {
    await ensureTabs(sheetId);
    // Cards
    const cardRows = (state.cards || []).map(cardToRow);
    await writeRange(sheetId, "Cards!A1:K1", [CARDS_HEADERS]);
    await clearRange(sheetId, "Cards!A2:K100000");
    if (cardRows.length) {
      await writeRange(sheetId, "Cards!A2:K" + (cardRows.length + 1), cardRows);
    }
    // Events
    const eventRows = (state.events || []).map(eventToRow);
    await writeRange(sheetId, "Events!A1:E1", [EVENTS_HEADERS]);
    await clearRange(sheetId, "Events!A2:E100000");
    if (eventRows.length) {
      await writeRange(sheetId, "Events!A2:E" + (eventRows.length + 1), eventRows);
    }
    return { cards: cardRows.length, events: eventRows.length };
  }

  async function pullAll(sheetId) {
    await ensureTabs(sheetId);
    const cardRows  = await readRange(sheetId, "Cards!A2:K100000");
    const eventRows = await readRange(sheetId, "Events!A2:E100000");
    return {
      cards: cardRows.filter((r) => (r[1] || r[2])).map(rowToCard),
      events: eventRows.filter((r) => r[1]).map(rowToEvent),
    };
  }

  window.Sheets = {
    parseSheetId,
    loadGSI,
    connect,
    disconnect,
    isConnected,
    initialize,
    pushAll,
    pullAll,
    getSheetTabs,
  };
})();
