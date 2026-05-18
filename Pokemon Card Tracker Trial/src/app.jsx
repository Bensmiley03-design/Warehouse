/* global React, ReactDOM, PCT */
/* Main app shell: nav, routing, modals */

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

const NAV = [
  { id: "dashboard", label: "Dashboard", glyph: "▤" },
  { id: "inventory", label: "Inventory", glyph: "≡" },
  { id: "events",    label: "Events",    glyph: "◇" },
  { id: "expenses",  label: "Expenses",  glyph: "−" },
  { id: "reports",   label: "Reports",   glyph: "≣" },
  { id: "settings",  label: "Settings",  glyph: "⚙" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfy",
  "accent": "oklch(0.55 0.11 150)",
  "navStyle": "icons+labels"
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  root.style.setProperty("--gain", t.accent || "oklch(0.55 0.11 150)");
  document.body.dataset.density = t.density || "comfy";
  document.body.dataset.nav = t.navStyle || "icons+labels";
}

function App() {
  const s = useStore();
  const [route, setRoute] = useStateA({ name: "dashboard" });
  const [addOpen, setAddOpen] = useStateA(false);
  const [lotOpen, setLotOpen] = useStateA(false);
  const [sellPickerOpen, setSellPickerOpen] = useStateA(false);
  const [sellCard, setSellCard] = useStateA(null);
  const [tradePickerOpen, setTradePickerOpen] = useStateA(false);
  const [tradeCard, setTradeCard] = useStateA(null);
  const [startShowOpen, setStartShowOpen] = useStateA(false);
  const [helpOpen, setHelpOpen] = useStateA(false);
  const [newInvOpen, setNewInvOpen] = useStateA(false);
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffectA(() => { applyTweaks(tweaks); }, [tweaks]);

  // Auto-open help on first ever visit
  useEffectA(() => {
    if (!localStorage.getItem("pct.seen-help")) {
      setHelpOpen(true);
      localStorage.setItem("pct.seen-help", "1");
    }
  }, []);

  function go(r) {
    setRoute(typeof r === "string" ? { name: r } : r);
    window.scrollTo(0, 0);
  }

  const current = route.name;
  const pageTitle = {
    dashboard: "Dashboard",
    inventory: "Inventory",
    events: "Events",
    expenses: "Expenses",
    reports: "Reports",
    settings: "Settings",
    detail: "Card detail",
  }[current] || "";

  let body;
  if (current === "dashboard") body = <DashboardScreen go={go} onAdd={() => setAddOpen(true)} onSell={() => setSellPickerOpen(true)} onTrade={() => setTradePickerOpen(true)} onLot={() => setLotOpen(true)} onHelp={() => setHelpOpen(true)} onStartShow={() => setStartShowOpen(true)} />;
  else if (current === "inventory") body = <InventoryScreen go={go} onAdd={() => setAddOpen(true)} />;
  else if (current === "events") body = <EventsScreen />;
  else if (current === "expenses") body = <ExpensesScreen />;
  else if (current === "reports") body = <ReportsScreen />;
  else if (current === "settings") body = <SettingsScreen />;
  else if (current === "detail") body = <DetailScreen id={route.id} go={go} />;
  else body = <div className="empty">Not found.</div>;

  const sum = PCT.summary();

  return (
    <div className="app">
      {/* Sidebar (desktop) */}
      <aside className="sidebar">
        <div className="brand">
          <div className="mark"><img src="assets/brand-mark.png" alt="" /></div>
          <div>
            <div className="name">The Warehouse</div>
            <div className="sub">Inventory Card Tracker</div>
          </div>
        </div>

        <WorkspaceSwitcher onAddNew={() => setNewInvOpen(true)} onManage={() => go("settings")} />

        <div className="sidebar-scroll">
          <div className="nav-section">Main</div>
          {NAV.map((n) => (
            <button key={n.id}
              className={"navlink" + (current === n.id ? " active" : "")}
              onClick={() => go(n.id)}>
              <span className="ico">{n.glyph}</span>
              <span>{n.label}</span>
            </button>
          ))}

          <div className="nav-section">Quick add</div>
          <button className="navlink" onClick={() => setAddOpen(true)}>
            <span className="ico">+</span><span>Add a card</span>
          </button>
          <button className="navlink" onClick={() => setSellPickerOpen(true)}>
            <span className="ico">$</span><span>Sell a card</span>
          </button>
          <button className="navlink" onClick={() => setTradePickerOpen(true)}>
            <span className="ico">⇆</span><span>Trade a card</span>
          </button>
          <button className="navlink" onClick={() => setLotOpen(true)}>
            <span className="ico">÷</span><span>Split a lot</span>
          </button>
          <button className="navlink" onClick={() => setHelpOpen(true)}>
            <span className="ico">?</span><span>Help &amp; guide</span>
          </button>
        </div>

        <div className="card sidebar-totals" style={{ background: "var(--paper-2)", borderRadius: 10 }}>
          <div className="card-b" style={{ padding: 12 }}>
            <div className="muted small">Live totals</div>
            <div className="kv" style={{ marginTop: 6, gridTemplateColumns: "1fr auto" }}>
              <div className="k">On hand</div><div className="v">{sum.cardsOnHand}</div>
              <div className="k">Tied up</div><div className="v">{fmtMoney(sum.moneyTiedUp)}</div>
              <div className="k">Profit</div>
              <div className={"v " + profitClass(sum.profitFromSales)}>{fmtMoneySigned(sum.profitFromSales)}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <main className="main">
        <ShowBar onEnd={() => {
          if (confirm("End show mode? Your live tally will close.")) PCT.endShow();
        }} />
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <div className="brand" style={{ padding: 0, border: 0, margin: 0, flex: 1, minWidth: 0 }}>
            <div className="mark"><img src="assets/brand-mark.png" alt="" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="name" style={{ fontSize: 13 }}>{s.activeWorkspaceName}</div>
              <div className="sub" style={{ fontSize: 10 }}>The Warehouse · {pageTitle}</div>
            </div>
          </div>
          <WorkspaceSwitcherCompact onAddNew={() => setNewInvOpen(true)} onManage={() => go("settings")} />
          <button className="btn ghost sm" onClick={() => setHelpOpen(true)} aria-label="Help">?</button>
          <button className="btn ghost sm" onClick={() => go("settings")} aria-label="Settings">⚙</button>
        </div>

        {/* Desktop top bar */}
        <div className="topbar">
          <div className="title">{pageTitle}</div>
          {current === "detail" && <div className="crumb">/ {s.cards.find(c => c.id === route.id)?.name}</div>}
          <div className="topbar-actions">
            <button className="btn ghost" onClick={() => setHelpOpen(true)} aria-label="Help" title="Help & guide">? Help</button>
            <button className="btn" onClick={() => setLotOpen(true)}>Split a lot</button>
            <button className="btn" onClick={() => setTradePickerOpen(true)}>⇆ Trade</button>
            <button className="btn" onClick={() => setSellPickerOpen(true)}>$ Sell</button>
            <button className="btn primary" onClick={() => setAddOpen(true)}>+ Add card</button>
          </div>
        </div>

        <div className="page">{body}</div>
      </main>

      {/* Bottom tabs (mobile) */}
      <nav className="bottom-tabs">
        {NAV.slice(0, 5).map((n) => (
          <button key={n.id}
            className={"tab" + (current === n.id ? " active" : "")}
            onClick={() => go(n.id)}>
            <span className="glyph">{n.glyph}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {/* Floating + button (mobile) */}
      <button className="fab" onClick={() => setAddOpen(true)} aria-label="Add card">+</button>

      {addOpen && <AddCardModal onClose={() => setAddOpen(false)} />}
      {newInvOpen && <NewInventoryModal onClose={() => setNewInvOpen(false)} />}
      {lotOpen && <LotSplitter onClose={() => setLotOpen(false)} />}
      {sellPickerOpen && <SellPickerModal onClose={() => setSellPickerOpen(false)} onPick={(c) => { setSellPickerOpen(false); setSellCard(c); }} />}
      {sellCard && <SellModal card={sellCard} onClose={() => setSellCard(null)} />}
      {tradePickerOpen && <TradePickerModal onClose={() => setTradePickerOpen(false)} onPick={(c) => { setTradePickerOpen(false); setTradeCard(c); }} />}
      {tradeCard && <TradeModal card={tradeCard} onClose={() => setTradeCard(null)} />}
      {startShowOpen && <StartShowModal onClose={() => setStartShowOpen(false)} />}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Profit color">
          <TweakColor label="Accent" value={tweaks.accent}
            options={[
              "oklch(0.55 0.11 150)",
              "oklch(0.55 0.11 240)",
              "oklch(0.65 0.13 60)",
              "oklch(0.55 0.11 295)",
            ].map((c, i) => c)}
            onChange={(v) => setTweak('accent', v)} />
        </TweakSection>
        <TweakSection label="Density">
          <TweakRadio label="Density" value={tweaks.density}
            options={["comfy", "compact"]}
            onChange={(v) => setTweak('density', v)} />
        </TweakSection>
        <TweakSection label="Nav style">
          <TweakRadio label="Sidebar" value={tweaks.navStyle}
            options={["icons+labels", "compact"]}
            onChange={(v) => setTweak('navStyle', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

/* ======================= Workspace switcher ======================= */

function WorkspaceSwitcher({ onAddNew, onManage }) {
  const s = useStore();
  const [open, setOpen] = useStateA(false);
  const [renamingId, setRenamingId] = useStateA(null);
  const [renameValue, setRenameValue] = useStateA("");
  const ref = React.useRef(null);

  useEffectA(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setRenamingId(null); } };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function startRename(w, e) {
    e.stopPropagation();
    setRenamingId(w.id);
    setRenameValue(w.name);
  }
  function commitRename() {
    if (renamingId && renameValue.trim()) {
      PCT.renameWorkspace(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }

  const active = s.workspaces.find((w) => w.id === s.activeWorkspaceId) || s.workspaces[0];

  return (
    <div className="ws-switch" ref={ref}>
      <button className="ws-pill" onClick={() => setOpen(!open)}>
        <span className="ws-pill-label">Inventory</span>
        <span className="ws-pill-name">{active?.name}</span>
        <span className="ws-pill-caret">▾</span>
      </button>
      {open && (
        <div className="ws-pop">
          <div className="ws-pop-h">Switch inventory</div>
          {s.workspaces.map((w) => {
            const renaming = renamingId === w.id;
            return (
              <div key={w.id} className={"ws-item-wrap" + (w.id === s.activeWorkspaceId ? " active" : "")}>
                {renaming ? (
                  <input
                    className="input ws-rename-input"
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); }
                    }}
                  />
                ) : (
                  <>
                    <button
                      className={"ws-item" + (w.id === s.activeWorkspaceId ? " active" : "")}
                      onClick={() => { PCT.switchWorkspace(w.id); setOpen(false); }}>
                      <span className="ws-item-name">{w.name}</span>
                      <span className="ws-item-meta mono">{w.cardCount} on hand</span>
                      {w.id === s.activeWorkspaceId && <span className="ws-item-tick">✓</span>}
                    </button>
                    <button className="ws-item-edit" title="Rename"
                      onClick={(e) => startRename(w, e)}>✎</button>
                  </>
                )}
              </div>
            );
          })}
          <div className="ws-pop-div"></div>
          <button className="ws-item add" onClick={() => { setOpen(false); onAddNew && onAddNew(); }}>
            <span className="ws-item-glyph">+</span>
            <span className="ws-item-name">New inventory…</span>
          </button>
          <button className="ws-item" onClick={() => { setOpen(false); onManage && onManage(); }}>
            <span className="ws-item-glyph">⚙</span>
            <span className="ws-item-name">Manage inventories</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* Compact (mobile) variant — just a button that opens the same popover */
function WorkspaceSwitcherCompact({ onAddNew, onManage }) {
  const s = useStore();
  const [open, setOpen] = useStateA(false);
  const ref = React.useRef(null);
  useEffectA(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div className="ws-switch compact" ref={ref}>
      <button className="btn ghost sm" onClick={() => setOpen(!open)} aria-label="Switch inventory" title="Switch inventory">
        ⇅
      </button>
      {open && (
        <div className="ws-pop right">
          <div className="ws-pop-h">Switch inventory</div>
          {s.workspaces.map((w) => (
            <button key={w.id}
              className={"ws-item" + (w.id === s.activeWorkspaceId ? " active" : "")}
              onClick={() => { PCT.switchWorkspace(w.id); setOpen(false); }}>
              <span className="ws-item-name">{w.name}</span>
              {w.id === s.activeWorkspaceId && <span className="ws-item-tick">✓</span>}
            </button>
          ))}
          <div className="ws-pop-div"></div>
          <button className="ws-item add" onClick={() => { setOpen(false); onAddNew && onAddNew(); }}>
            <span className="ws-item-glyph">+</span><span className="ws-item-name">New inventory…</span>
          </button>
          <button className="ws-item" onClick={() => { setOpen(false); onManage && onManage(); }}>
            <span className="ws-item-glyph">⚙</span><span className="ws-item-name">Manage</span>
          </button>
        </div>
      )}
    </div>
  );
}

function NewInventoryModal({ onClose }) {
  const [name, setName] = useStateA("");
  const [gsheet, setGsheet] = useStateA("");
  const canSave = name.trim().length > 0;
  function save() {
    if (!canSave) return;
    PCT.createWorkspace({ name: name.trim(), gsheetUrl: gsheet.trim() });
    onClose();
  }
  return (
    <Modal
      title="New inventory"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!canSave} onClick={save}>Create inventory</button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <div className="muted small">
          Each inventory is a separate set of cards, events, expenses, and Google Sheet link. Switch between them anytime from the sidebar.
        </div>
        <Field label="Inventory name">
          <input className="input" autoFocus
            placeholder="e.g. Vintage Binder, Show Stock, Partner's Pile"
            value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Google Sheet URL (optional)" hint="You can connect a sheet later in Settings.">
          <input className="input mono"
            placeholder="https://docs.google.com/spreadsheets/d/…"
            value={gsheet} onChange={(e) => setGsheet(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

Object.assign(window, {
  WorkspaceSwitcher, WorkspaceSwitcherCompact, NewInventoryModal,
});

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
