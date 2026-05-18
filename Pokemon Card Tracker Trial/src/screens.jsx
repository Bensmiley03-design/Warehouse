/* global React, PCT */
/* Screens: Dashboard, Inventory, Detail, Events, Reports, Settings */

const { useState: useStateS, useMemo: useMemoS, useEffect: useEffectS } = React;

/* ======================= DASHBOARD ======================= */

function DashboardScreen({ go, onAdd, onSell, onTrade, onLot, onHelp, onStartShow }) {
  const s = useStore();
  const sum = PCT.summary();
  const sess = PCT.sessionStats();
  const recent = useMemoS(() => {
    return [...s.cards].slice(0, 8);
  }, [s.cards]);
  const monthly = useMemoS(() => PCT.monthlyProfit(6), [s.cards]);
  const showDemo = !s.settings.demoCleared && !s.settings.demoDismissed && s.cards.length > 0;

  function clearDemo() {
    if (confirm("Wipe the demo data and start fresh? This can't be undone.")) {
      PCT.clearAll();
    }
  }
  function dismissDemo() {
    PCT.updateSettings({ demoDismissed: true });
  }

  return (
    <div className="flexcol" style={{ gap: 0 }}>
      {showDemo && <DemoBanner cardCount={s.cards.length} eventCount={s.events.length} onClear={clearDemo} onDismiss={dismissDemo} />}

      <div className="quick-actions">
        <button className="qa primary" onClick={onAdd}>
          <span className="g">+</span>
          <span>
            <div className="t">Add card</div>
            <div className="s">Log a single buy</div>
          </span>
        </button>
        <button className="qa" onClick={onSell}>
          <span className="g">$</span>
          <span>
            <div className="t">Sell card</div>
            <div className="s">Mark one out</div>
          </span>
        </button>
        <button className="qa" onClick={onTrade}>
          <span className="g">⇆</span>
          <span>
            <div className="t">Trade card</div>
            <div className="s">Give & receive</div>
          </span>
        </button>
        <button className="qa" onClick={onLot}>
          <span className="g">÷</span>
          <span>
            <div className="t">Split a lot</div>
            <div className="s">Binder/bulk split</div>
          </span>
        </button>
      </div>

      {!sess && (
        <div className="show-cta">
          <div className="show-cta-text">
            <div className="t">Heading to a show?</div>
            <div className="s">Start show mode to auto-tag every Add / Sell / Trade with the event and keep a live tally.</div>
          </div>
          <button className="btn primary" onClick={onStartShow}>Start show</button>
        </div>
      )}

      <div className="section-h">
        <div className="t">Inventory</div>
      </div>
      <div className="stat-grid">
        <Stat label="Cards on hand" accent="ink"
          value={<span>{sum.cardsOnHand}</span>}
          sub={<span>{s.cards.filter(c => PCT.isOnHand(c)).length} rows</span>} />
        <Stat label="Money tied up" accent="ink"
          value={fmtMoney(sum.moneyTiedUp)}
          sub={<span>Avg ${sum.cardsOnHand ? Math.round(sum.moneyTiedUp / sum.cardsOnHand) : 0}/card</span>} />
        <Stat label="Avg cost basis" accent="ink"
          value={"$" + (sum.cardsOnHand ? (sum.moneyTiedUp / sum.cardsOnHand).toFixed(2) : "0.00")} />
      </div>

      <div className="section-h">
        <div className="t">Performance</div>
        <button className="a" onClick={() => go("reports")}>Reports →</button>
      </div>
      <div className="stat-grid">
        <Stat label="Cards sold" accent="gain" value={sum.cardsSold} sub="all-time" />
        <Stat label="Profit from sales" accent="gain" value={fmtMoneySigned(sum.profitFromSales)}
          sub={<span>on {fmtMoney(sum.cogs)} cost</span>} />
        <Stat label="Margin overall" accent="gain"
          value={<span>{sum.margin.toFixed(0)}<span style={{ fontSize: 18, marginLeft: 2 }}>%</span></span>}
          sub={<span>{fmtMoney(sum.revenue)} revenue / {fmtMoneySigned(sum.profitFromSales)} profit</span>} />
      </div>

      <div className="section-h">
        <div className="t">Bottom line</div>
        <button className="a" onClick={() => go("expenses")}>Expenses →</button>
      </div>
      <div className="stat-grid">
        <Stat label="Expenses (all)" accent="loss" value={fmtMoney(sum.expenses)}
          sub={(s.expenses || []).length + " entries"} />
        <Stat label="Trade net" accent="trade" value={fmtMoneySigned(sum.tradeNet)} sub={sum.tradesCount + " trades"} />
        <Stat label="Net profit"
          accent={(sum.netProfit - sum.giveawayCost) >= 0 ? "gain" : "loss"}
          value={fmtMoneySigned(sum.netProfit)} sub="profit − expenses" />
      </div>

      <div className="section-h">
        <div className="t">Giveaways</div>
      </div>
      <div className="stat-grid">
        <Stat label="Cards given to kids" accent="hold" value={sum.cardsGiven} sub="lifetime" />
        <Stat label="Cost of giveaways" accent="hold" value={fmtMoney(sum.giveawayCost)} sub="basis given out" />
        <Stat label="Net (profit − giveaways)" accent={sum.profitFromSales - sum.giveawayCost >= 0 ? "gain" : "loss"}
          value={fmtMoneySigned(sum.profitFromSales - sum.giveawayCost)} sub="the wholesome math" />
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-h">
            <div className="h-title">Profit, last 6 months</div>
            <div className="h-sub">${Math.round(monthly.reduce((a, b) => a + b.value, 0)).toLocaleString()} total</div>
          </div>
          <div className="card-b">
            <BarChart data={monthly} />
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <div className="h-title">Recent activity</div>
            <button className="btn ghost sm" onClick={() => go("inventory")}>View all →</button>
          </div>
          <div className="card-b tight">
            {recent.length === 0 ? (
              <div className="empty">No cards yet. Add your first one →</div>
            ) : recent.map((c) => <ActivityRow key={c.id} card={c} onClick={() => go({ name: "detail", id: c.id })} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ card, onClick }) {
  const status = card.status || "On hand";
  const cls = !card.status ? "added" :
    card.status === "Sold" ? "sold" :
    card.status === "Traded" ? "trade" :
    card.status === "Given Away" ? "given" : "";
  const glyph = !card.status ? "+" :
    card.status === "Sold" ? "$" :
    card.status === "Traded" ? "⇆" :
    card.status === "Given Away" ? "♡" : "•";
  const p = PCT.profit(card);
  return (
    <div className={"feed-item " + cls} onClick={onClick} style={{ cursor: "pointer" }}>
      <div className="glyph">{glyph}</div>
      <div>
        <div className="t" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.name || "(blank row)"}
        </div>
        <div className="s">{status} • {fmtDateShort(card.dateOut || card.date)} • {card.qty}×</div>
      </div>
      <div className={"amt " + (p == null ? "" : p > 0 ? "pos" : p < 0 ? "neg" : "")}>
        {p == null ? fmtMoney(card.paid) : fmtMoneySigned(p)}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  if (!data || !data.length) return <div className="empty">No data yet.</div>;
  const max = Math.max(1, ...data.map((d) => Math.max(0, d.value)));
  const min = Math.min(0, ...data.map((d) => d.value));
  const W = 720, H = 240, P = 28;
  const innerW = W - P * 2;
  const innerH = H - P * 2;
  const range = max - min || 1;
  const zeroY = P + ((max) / range) * innerH;
  const barW = innerW / data.length - 14;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "auto", display: "block", maxHeight: 260 }}>
      <line className="axis" x1={P} x2={W - P} y1={zeroY} y2={zeroY} />
      {data.map((d, i) => {
        const x = P + i * (innerW / data.length) + 7;
        const h = Math.abs(d.value) / range * innerH;
        const y = d.value >= 0 ? zeroY - h : zeroY;
        return (
          <g key={d.month}>
            <rect className="bar" x={x} y={y} width={barW} height={Math.max(h, 1)}
              style={{ fill: d.value < 0 ? "var(--loss)" : "var(--gain)" }} rx="3" />
            <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize="12">{fmtMonth(d.month)}</text>
            {d.value !== 0 && (
              <text x={x + barW / 2} y={d.value >= 0 ? y - 6 : y + h + 14} textAnchor="middle"
                fontSize="11" style={{ fill: "var(--ink-2)" }}>
                ${Math.round(d.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ======================= INVENTORY ======================= */

function InventoryScreen({ go, onAdd }) {
  const s = useStore();
  const [q, setQ] = useStateS("");
  const [filter, setFilter] = useStateS("on-hand");
  const [sort, setSort] = useStateS("recent");

  const cards = useMemoS(() => {
    let arr = s.cards.filter((c) => c.name);
    if (q) {
      const Q = q.toLowerCase();
      arr = arr.filter((c) => (c.name || "").toLowerCase().includes(Q)
        || (c.notes || "").toLowerCase().includes(Q));
    }
    if (filter === "on-hand") arr = arr.filter((c) => !c.status);
    else if (filter === "sold") arr = arr.filter((c) => c.status === "Sold");
    else if (filter === "given") arr = arr.filter((c) => c.status === "Given Away");
    else if (filter === "traded") arr = arr.filter((c) => c.status === "Traded");

    if (sort === "recent") arr = [...arr].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    else if (sort === "name") arr = [...arr].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sort === "profit") arr = [...arr].sort((a, b) => (PCT.profit(b) || 0) - (PCT.profit(a) || 0));
    else if (sort === "paid") arr = [...arr].sort((a, b) => (b.paid || 0) - (a.paid || 0));
    return arr;
  }, [s.cards, q, filter, sort]);

  const counts = useMemoS(() => ({
    all: s.cards.filter((c) => c.name).length,
    "on-hand": s.cards.filter((c) => c.name && !c.status).length,
    sold: s.cards.filter((c) => c.status === "Sold").length,
    given: s.cards.filter((c) => c.status === "Given Away").length,
    traded: s.cards.filter((c) => c.status === "Traded").length,
  }), [s.cards]);

  return (
    <div>
      <div className="toolbar">
        <div className="search grow">
          <span className="glyph">⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search cards, notes…" />
        </div>
        <button className="btn primary" onClick={onAdd}>+ Add card</button>
      </div>

      <div className="toolbar" style={{ marginBottom: 14 }}>
        {[
          ["all", "All", counts.all],
          ["on-hand", "On hand", counts["on-hand"]],
          ["sold", "Sold", counts.sold],
          ["traded", "Traded", counts.traded],
          ["given", "Given", counts.given],
        ].map(([k, lab, n]) => (
          <button key={k} className={"chip" + (filter === k ? " active" : "")}
            onClick={() => setFilter(k)}>{lab} <span className="mono" style={{ opacity: 0.6 }}>{n}</span></button>
        ))}
        <div className="grow" />
        <select className="select" style={{ width: 160 }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Newest first</option>
          <option value="name">Card A→Z</option>
          <option value="profit">Highest profit</option>
          <option value="paid">Highest cost</option>
        </select>
      </div>

      <div className="card">
        {cards.length === 0 ? (
          <div className="empty">
            <div className="t">Nothing matches.</div>
            <div className="small">Try clearing search or switching tabs.</div>
          </div>
        ) : (
          <>
            <div className="hide-on-mobile">
              <table className="table">
                <thead>
                  <tr>
                    <th>Card</th>
                    <th>Status</th>
                    <th className="num">Qty</th>
                    <th className="num">Paid</th>
                    <th className="num">Got back</th>
                    <th className="num">Profit</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c) => {
                    const p = PCT.profit(c);
                    return (
                      <tr key={c.id} className="row-link" onClick={() => go({ name: "detail", id: c.id })}>
                        <td className="name">{c.name}</td>
                        <td><StatusBadge status={c.status} /></td>
                        <td className="num mono">{c.qty}</td>
                        <td className="num mono">{fmtMoney(c.paid)}</td>
                        <td className="num mono">{c.gotBack == null ? "—" : fmtMoney(c.gotBack)}</td>
                        <td className={"num mono " + profitClass(p)}>{p == null ? "—" : fmtMoneySigned(p)}</td>
                        <td className="mono muted small">{fmtDateShort(c.date)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="show-on-mobile">
              {cards.map((c) => {
                const p = PCT.profit(c);
                return (
                  <div key={c.id} className="cardrow" onClick={() => go({ name: "detail", id: c.id })}>
                    <div>
                      <div className="ttl">{c.name}</div>
                      <div className="meta">
                        <StatusBadge status={c.status} />
                        <span>{c.qty}×</span>
                        <span>{fmtDateShort(c.date)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="price">{fmtMoney(c.paid)}</div>
                      <div className={"pl " + (p == null ? "" : p > 0 ? "pos" : p < 0 ? "neg" : "")}>
                        {p == null ? "on hand" : fmtMoneySigned(p)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ======================= DETAIL ======================= */

function DetailScreen({ id, go }) {
  const s = useStore();
  const card = s.cards.find((c) => c.id === id);
  const [editing, setEditing] = useStateS(false);
  const [sellOpen, setSellOpen] = useStateS(false);
  const [form, setForm] = useStateS(card);

  useEffectS(() => { setForm(card); }, [card]);

  if (!card) {
    return (
      <div className="empty">
        <div className="t">Card not found.</div>
        <button className="btn" onClick={() => go("inventory")}>← Back to inventory</button>
      </div>
    );
  }
  const p = PCT.profit(card);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  function save() {
    PCT.updateCard(card.id, form);
    setEditing(false);
  }
  function del() {
    if (confirm("Delete this card row? This can't be undone.")) {
      PCT.deleteCard(card.id);
      go("inventory");
    }
  }

  return (
    <div>
      <div className="toolbar">
        <button className="btn ghost" onClick={() => go("inventory")}>← Inventory</button>
        <div className="grow" />
        {!editing && !card.status && (
          <button className="btn primary" onClick={() => setSellOpen(true)}>Mark out</button>
        )}
        {!editing ? (
          <button className="btn" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <>
            <button className="btn" onClick={() => { setForm(card); setEditing(false); }}>Cancel</button>
            <button className="btn primary" onClick={save}>Save</button>
          </>
        )}
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="card-h">
            <div>
              <div className="muted small">{card.event || "—"}</div>
              <div className="h-title" style={{ fontSize: 18, marginTop: 2 }}>{card.name}</div>
            </div>
            <StatusBadge status={card.status} />
          </div>
          <div className="card-b">
            {!editing ? (
              <div className="flexcol" style={{ gap: 16 }}>
                <div className="kv">
                  <div className="k">Date bought</div><div className="v">{fmtDate(card.date)}</div>
                  <div className="k">Quantity</div><div className="v">{card.qty}</div>
                  <div className="k">Paid</div><div className="v">{fmtMoney(card.paid)}</div>
                  {card.status && card.status !== "Keeping" && (
                    <>
                      <div className="k">Date out</div><div className="v">{fmtDate(card.dateOut)}</div>
                      {card.gotBack != null && (
                        <>
                          <div className="k">Got back</div><div className="v">{fmtMoney(card.gotBack)}</div>
                        </>
                      )}
                    </>
                  )}
                  {card.event && (<><div className="k">Event</div><div className="v">{card.event}</div></>)}
                </div>
                {card.notes && (
                  <div>
                    <div className="muted small" style={{ marginBottom: 4 }}>Notes</div>
                    <div style={{ background: "var(--paper-2)", padding: 12, borderRadius: 8 }}>{card.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flexcol" style={{ gap: 14 }}>
                <Field label="Card">
                  <input className="input" value={form.name} onChange={(e) => set("name")(e.target.value)} />
                </Field>
                <div className="field-row">
                  <Field label="Qty"><input className="input mono" type="number" value={form.qty} onChange={(e) => set("qty")(e.target.value)} /></Field>
                  <Field label="Paid"><MoneyInput value={form.paid} onChange={set("paid")} /></Field>
                </div>
                <div className="field-row">
                  <Field label="Date bought"><input className="input mono" type="date" value={form.date || ""} onChange={(e) => set("date")(e.target.value)} /></Field>
                  <Field label="Status">
                    <select className="select" value={form.status || ""} onChange={(e) => set("status")(e.target.value)}>
                      <option value="">On hand</option>
                      <option value="Sold">Sold</option>
                      <option value="Traded">Traded</option>
                      <option value="Given Away">Given Away</option>
                      <option value="Keeping">Keeping</option>
                    </select>
                  </Field>
                </div>
                {form.status && form.status !== "Keeping" && (
                  <div className="field-row">
                    <Field label="Date out"><input className="input mono" type="date" value={form.dateOut || ""} onChange={(e) => set("dateOut")(e.target.value)} /></Field>
                    <Field label="Got back"><MoneyInput value={form.gotBack} onChange={set("gotBack")} /></Field>
                  </div>
                )}
                <Field label="Event">
                  <select className="select" value={form.event || ""} onChange={(e) => set("event")(e.target.value || null)}>
                    <option value="">— none —</option>
                    {s.events.map((ev) => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
                  </select>
                </Field>
                <Field label="Notes">
                  <textarea className="textarea" value={form.notes || ""} onChange={(e) => set("notes")(e.target.value)} />
                </Field>
                <button className="btn danger" onClick={del}>Delete row</button>
              </div>
            )}
          </div>
        </div>

        <div className="flexcol" style={{ gap: 16 }}>
          <div className="card">
            <div className="card-h"><div className="h-title">P&L on this row</div></div>
            <div className="card-b">
              <div className="kv">
                <div className="k">Cost</div><div className="v">{fmtMoney(card.paid)}</div>
                <div className="k">Revenue</div><div className="v">{card.gotBack == null ? "—" : fmtMoney(card.gotBack)}</div>
                <div className="k">Profit</div><div className={"v " + profitClass(p)} style={{ fontSize: 18 }}>{p == null ? "—" : fmtMoneySigned(p)}</div>
                {card.paid > 0 && p != null && (
                  <>
                    <div className="k">Margin</div>
                    <div className={"v " + profitClass(p)}>{((p / card.paid) * 100).toFixed(0)}%</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {!card.status && (
            <div className="card">
              <div className="card-h"><div className="h-title">Quick actions</div></div>
              <div className="card-b flexcol" style={{ gap: 8 }}>
                <button className="btn block primary" onClick={() => setSellOpen(true)}>Mark out (sell/trade/give)</button>
                <button className="btn block" onClick={() => setEditing(true)}>Edit details</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {sellOpen && <SellModal card={card} onClose={() => setSellOpen(false)} />}
    </div>
  );
}

/* ======================= EVENTS ======================= */

function EventsScreen() {
  const s = useStore();
  const [editing, setEditing] = useStateS(null); // event obj or "new"
  const evs = s.events;

  return (
    <div>
      <div className="toolbar">
        <div className="muted small">Track each con or show as its own P&L. Tag cards with the event when buying or selling.</div>
        <div className="grow" />
        <button className="btn primary" onClick={() => setEditing("new")}>+ Add event</button>
      </div>

      <div className="grid-2">
        {evs.length === 0 && <div className="empty">No events yet.</div>}
        {evs.map((ev) => {
          const pl = PCT.eventPL(ev.name);
          return (
            <div className="card" key={ev.id}>
              <div className="card-h">
                <div>
                  <div className="h-title">{ev.name}</div>
                  <div className="h-sub">{fmtDate(ev.date)} • {ev.location || "—"}</div>
                </div>
                <button className="btn ghost sm" onClick={() => setEditing(ev)}>Edit</button>
              </div>
              <div className="card-b">
                <div className="grid-3" style={{ gap: 12 }}>
                  <MiniStat label="Revenue" value={fmtMoney(pl.revenue)} />
                  <MiniStat label="COGS" value={fmtMoney(pl.cogs)} />
                  <MiniStat label="Margin" value={pl.revenue > 0 ? pl.margin.toFixed(0) + "%" : "—"}
                    cls={profitClass(pl.grossProfit)} />
                </div>
                <div className="hr"></div>
                <div className="kv">
                  <div className="k">Cards sold</div><div className="v">{pl.cardsSold}</div>
                  <div className="k">Gross profit</div><div className={"v " + profitClass(pl.grossProfit)}>{fmtMoneySigned(pl.grossProfit)}</div>
                  <div className="k">Table fee</div><div className="v">−{fmtMoney(pl.tableFee)}</div>
                  <div className="k">Other expenses</div><div className="v">−{fmtMoney(pl.otherExpenses)}</div>
                  <div className="k">Giveaway cost</div><div className="v">−{fmtMoney(pl.giveawayCost)}</div>
                  <div className="k" style={{ fontWeight: 600, color: "var(--ink)" }}>Net profit</div>
                  <div className={"v " + profitClass(pl.netProfit)} style={{ fontSize: 18 }}>{fmtMoneySigned(pl.netProfit)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <EventModal
          event={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, cls }) {
  return (
    <div style={{ background: "var(--paper-2)", borderRadius: 8, padding: "10px 12px" }}>
      <div className="muted small" style={{ marginBottom: 2 }}>{label}</div>
      <div className={"mono tnum " + (cls || "")} style={{ fontSize: 18, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

/* ======================= REPORTS ======================= */

function ReportsScreen() {
  const s = useStore();
  const [range, setRange] = useStateS(6);
  const sum = PCT.summary();
  const monthly = useMemoS(() => PCT.monthlyProfit(range), [s.cards, range]);
  const best = useMemoS(() => PCT.bestSellers(5), [s.cards]);
  const evs = useMemoS(() => s.events.map((e) => ({ ev: e, pl: PCT.eventPL(e.name) })), [s.cards, s.events]);

  return (
    <div className="flexcol" style={{ gap: 18 }}>
      <div className="stat-grid">
        <Stat label="Lifetime profit" accent="gain" value={fmtMoneySigned(sum.profitFromSales)} />
        <Stat label="Cards sold" accent="ink" value={sum.cardsSold} />
        <Stat label="Avg profit / card" accent="ink"
          value={sum.cardsSold ? fmtMoneySigned(sum.profitFromSales / sum.cardsSold) : "—"} />
      </div>

      <div className="card">
        <div className="card-h">
          <div className="h-title">Profit over time</div>
          <div className="flexrow">
            {[3, 6, 12].map((r) => (
              <button key={r} className={"chip" + (range === r ? " active" : "")} onClick={() => setRange(r)}>
                {r} mo
              </button>
            ))}
          </div>
        </div>
        <div className="card-b">
          <BarChart data={monthly} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-h"><div className="h-title">Top earners</div></div>
          <div className="card-b tight">
            {best.length === 0 && <div className="empty">No sold cards yet.</div>}
            {best.map((c) => (
              <div key={c.id} className="feed-item sold">
                <div className="glyph">$</div>
                <div>
                  <div className="t" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div className="s">{fmtDate(c.dateOut)} • paid {fmtMoney(c.paid)}</div>
                </div>
                <div className={"amt " + profitClass(c.profit)}>{fmtMoneySigned(c.profit)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><div className="h-title">Event P&L</div></div>
          <div className="card-b tight">
            {evs.length === 0 && <div className="empty">No events yet.</div>}
            {evs.map(({ ev, pl }) => (
              <div key={ev.id} className="feed-item">
                <div className="glyph">◇</div>
                <div>
                  <div className="t">{ev.name}</div>
                  <div className="s">{fmtDate(ev.date)} • {pl.cardsSold} sold • fee {fmtMoney(pl.tableFee)}</div>
                </div>
                <div className={"amt " + profitClass(pl.netProfit)}>{fmtMoneySigned(pl.netProfit)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================= SETTINGS ======================= */

function SettingsScreen() {
  const s = useStore();
  const [gsheet, setGsheet] = useStateS(s.settings.gsheetUrl || "");
  const [clientId, setClientId] = useStateS(s.settings.googleClientId || "");

  // Sync state
  const [connected, setConnected] = useStateS(false);
  const [busy, setBusy] = useStateS(false);
  const [status, setStatus] = useStateS(null); // {kind:'ok'|'err', text}
  const [showSetup, setShowSetup] = useStateS(false);

  useEffectS(() => {
    setGsheet(s.settings.gsheetUrl || "");
    setClientId(s.settings.googleClientId || "");
  }, [s.settings.gsheetUrl, s.settings.googleClientId, s.activeWorkspaceId]);

  function saveSyncFields() {
    PCT.updateSettings({ gsheetUrl: gsheet, googleClientId: clientId });
  }

  async function doConnect() {
    saveSyncFields();
    if (!clientId.trim()) { setStatus({ kind: "err", text: "Paste your Google Client ID first." }); setShowSetup(true); return; }
    setBusy(true); setStatus(null);
    try {
      await Sheets.connect(clientId.trim());
      setConnected(true);
      setStatus({ kind: "ok", text: "Connected to Google. Now click Initialize sheet (one-time) or Push to upload your data." });
    } catch (e) { setStatus({ kind: "err", text: String(e.message || e) }); }
    finally { setBusy(false); }
  }

  function doDisconnect() {
    Sheets.disconnect();
    setConnected(false);
    setStatus({ kind: "ok", text: "Disconnected." });
  }

  function requireSheetId() {
    const id = Sheets.parseSheetId(gsheet);
    if (!id) { setStatus({ kind: "err", text: "That doesn't look like a Google Sheets URL. Paste the link from your browser's address bar." }); return null; }
    return id;
  }

  async function doInitialize() {
    const id = requireSheetId(); if (!id) return;
    setBusy(true); setStatus(null);
    try {
      await Sheets.initialize(id);
      setStatus({ kind: "ok", text: "Sheet initialized — Cards and Events tabs are ready with headers." });
    } catch (e) { setStatus({ kind: "err", text: String(e.message || e) }); }
    finally { setBusy(false); }
  }

  async function doPush() {
    const id = requireSheetId(); if (!id) return;
    if (!confirm("Push will overwrite the rows in your Google Sheet with everything from this device. Continue?")) return;
    setBusy(true); setStatus(null);
    try {
      const r = await Sheets.pushAll(id, PCT.getState());
      PCT.updateSettings({ lastSyncedAt: new Date().toISOString(), lastSyncDirection: "push" });
      setStatus({ kind: "ok", text: "Pushed " + r.cards + " cards and " + r.events + " events to the sheet." });
    } catch (e) { setStatus({ kind: "err", text: String(e.message || e) }); }
    finally { setBusy(false); }
  }

  async function doPull() {
    const id = requireSheetId(); if (!id) return;
    if (!confirm("Pull will replace the cards and events on this device with what's in the Google Sheet. Continue?")) return;
    setBusy(true); setStatus(null);
    try {
      const data = await Sheets.pullAll(id);
      PCT.replaceAll(data);
      PCT.updateSettings({ lastSyncedAt: new Date().toISOString(), lastSyncDirection: "pull" });
      setStatus({ kind: "ok", text: "Pulled " + data.cards.length + " cards and " + data.events.length + " events from the sheet." });
    } catch (e) { setStatus({ kind: "err", text: String(e.message || e) }); }
    finally { setBusy(false); }
  }

  const lastSync = s.settings.lastSyncedAt;

  return (
    <div className="flexcol" style={{ gap: 18 }}>
      <InventoriesCard />

      <div className="card">
        <div className="card-h">
          <div>
            <div className="h-title">Google Sheets sync</div>
            <div className="h-sub">Each inventory syncs to its own sheet — currently editing <b>{s.activeWorkspaceName}</b></div>
          </div>
          <div className="flexrow">
            <span className={"badge " + (connected ? "sold" : "on-hand")}>
              <span className="bd"></span>{connected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>
        <div className="card-b flexcol" style={{ gap: 14 }}>
          <Field label="Google Sheet URL">
            <input className="input mono" placeholder="https://docs.google.com/spreadsheets/d/…"
              value={gsheet} onChange={(e) => setGsheet(e.target.value)}
              onBlur={saveSyncFields} />
          </Field>
          <Field label="Google OAuth Client ID" hint="One-time setup. Click 'How do I get this?' below for the 5-step guide.">
            <input className="input mono" placeholder="123456789012-abc...apps.googleusercontent.com"
              value={clientId} onChange={(e) => setClientId(e.target.value)}
              onBlur={saveSyncFields} />
          </Field>

          <div className="flexrow">
            {!connected ? (
              <button className="btn primary" disabled={busy} onClick={doConnect}>
                {busy ? "Connecting…" : "Connect to Google"}
              </button>
            ) : (
              <>
                <button className="btn" disabled={busy} onClick={doInitialize}>Initialize sheet</button>
                <button className="btn primary" disabled={busy} onClick={doPush}>↑ Push to sheet</button>
                <button className="btn" disabled={busy} onClick={doPull}>↓ Pull from sheet</button>
                <div className="grow"></div>
                <button className="btn ghost" disabled={busy} onClick={doDisconnect}>Disconnect</button>
              </>
            )}
          </div>

          {status && (
            <div className={"sync-status " + (status.kind === "ok" ? "ok" : "err")}>
              {status.text}
            </div>
          )}

          {lastSync && (
            <div className="muted small">
              Last {s.settings.lastSyncDirection === "push" ? "pushed" : "pulled"}{" "}
              {new Date(lastSync).toLocaleString()}.
            </div>
          )}

          <button className="btn ghost sm" style={{ alignSelf: "flex-start" }}
            onClick={() => setShowSetup(!showSetup)}>
            {showSetup ? "▾" : "▸"} How do I get the Client ID?
          </button>

          {showSetup && <SetupGuide />}
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div className="h-title">Print / PDF reports</div>
          <div className="h-sub">For taxes, accountant, or as a paper backup at a show</div>
        </div>
        <div className="card-b flexcol" style={{ gap: 14 }}>
          <div className="muted small">
            Opens a print-formatted page with your current inventory, sales history, and expenses. Use your browser's <b>Cmd/Ctrl+P</b> to save as PDF or send to a printer.
          </div>
          <button className="btn primary" style={{ alignSelf: "flex-start" }} onClick={openPrintReport}>
            Generate inventory + P&L report
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div className="h-title">Month-end snapshots</div>
          <div className="h-sub">For taxes & tracking</div>
        </div>
        <div className="card-b flexcol" style={{ gap: 14 }}>
          <div className="muted small">
            Lock today's inventory into a dated snapshot. Snapshots are read-only and give you a clean inventory file for the 1st of each month.
          </div>
          <div className="flexrow">
            <button className="btn primary" onClick={() => PCT.snapshot()}>+ Take snapshot now</button>
            <button className="btn" onClick={() => PCT.downloadCSV("inventory")}>Export current to CSV</button>
          </div>
          {s.snapshots.length > 0 && (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="card-b tight">
                {s.snapshots.map((sn) => (
                  <div key={sn.id} className="feed-item">
                    <div className="glyph">◷</div>
                    <div>
                      <div className="t">{sn.label}</div>
                      <div className="s">Taken {fmtDate(sn.date)} • {sn.cards.length} rows • profit so far {fmtMoneySigned(sn.summary.profitFromSales)}</div>
                    </div>
                    <div className="flexrow">
                      <button className="btn sm" onClick={() => {
                        const tmp = JSON.stringify(sn.cards, null, 2);
                        const blob = new Blob([tmp], { type: "application/json" });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = sn.label.replace(/\s+/g, "-") + ".json";
                        a.click();
                      }}>Export</button>
                      <button className="btn sm danger" onClick={() => PCT.deleteSnapshot(sn.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h"><div className="h-title">Danger zone</div></div>
        <div className="card-b flexcol" style={{ gap: 10 }}>
          <div className="muted small">Reset clears all data and reloads the demo seed.</div>
          <button className="btn danger" style={{ alignSelf: "flex-start" }}
            onClick={() => { if (confirm("Reset all data?")) PCT.resetAll(); }}>Reset all data</button>
        </div>
      </div>
    </div>
  );
}

/* ======================= INVENTORIES (workspace management) ======================= */

function InventoriesCard() {
  const s = useStore();
  const [newOpen, setNewOpen] = useStateS(false);
  const [renamingId, setRenamingId] = useStateS(null);
  const [renameValue, setRenameValue] = useStateS("");

  function startRename(w) {
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
  function doDelete(w) {
    if (s.workspaces.length <= 1) {
      alert("You need at least one inventory. Create another one before deleting this one.");
      return;
    }
    const msg = "Delete inventory \"" + w.name + "\"?\n\n" +
      "This permanently removes its cards, events, expenses, and snapshots on this device. The linked Google Sheet (if any) is NOT touched.";
    if (confirm(msg)) PCT.deleteWorkspace(w.id);
  }

  return (
    <div className="card">
      <div className="card-h">
        <div>
          <div className="h-title">Inventories</div>
          <div className="h-sub">Separate sets of cards, events, expenses — each with its own Google Sheet</div>
        </div>
        <button className="btn primary" onClick={() => setNewOpen(true)}>+ New inventory</button>
      </div>
      <div className="card-b">
        <div className="inv-list">
          {s.workspaces.map((w) => {
            const isActive = w.id === s.activeWorkspaceId;
            const renaming = renamingId === w.id;
            return (
              <div key={w.id} className={"inv-row" + (isActive ? " active" : "")}>
                <span className="inv-dot" title={isActive ? "Active" : ""}></span>
                <div style={{ minWidth: 0 }}>
                  {renaming ? (
                    <input
                      className="input"
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
                      <div className="inv-name">
                        {w.name}
                        {isActive && <span className="badge sold" style={{ marginLeft: 8 }}>
                          <span className="bd"></span>Active
                        </span>}
                      </div>
                      <div className="inv-meta mono">
                        {w.totalRows} {w.totalRows === 1 ? "row" : "rows"} · {w.cardCount} on hand
                      </div>
                    </>
                  )}
                </div>
                <div className="inv-actions">
                  {!isActive && (
                    <button className="btn sm" onClick={() => PCT.switchWorkspace(w.id)}>Switch to</button>
                  )}
                  <button className="btn sm" onClick={() => startRename(w)}>Rename</button>
                  <button className="btn sm danger" disabled={s.workspaces.length <= 1}
                    onClick={() => doDelete(w)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="muted small" style={{ marginTop: 10 }}>
          <b>Tip:</b> link each inventory to a separate Google Sheet below — the sync section below is scoped to the inventory shown as <b>Active</b>.
        </div>
      </div>

      {newOpen && <NewInventoryModal onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function SetupGuide() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-app-url";
  return (
    <div className="setup-guide">
      <p style={{ marginTop: 0 }}>
        Google requires every app that talks to its APIs to be registered (free, ≈5 min, one-time). Follow these steps in your Google account:
      </p>
      <ol className="setup-steps">
        <li>
          <div>
          <div className="ss-t">Open Google Cloud Console</div>
          <div className="ss-s">
            Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">console.cloud.google.com</a>{" "}
            and create a new project (top-left dropdown → New Project). Name it anything — "The Warehouse" works.
          </div>
        </div>
        </li>
        <li>
          <div>
          <div className="ss-t">Enable the Sheets API</div>
          <div className="ss-s">
            In the search bar at the top, type <code>Sheets API</code>, click the result, then click <b>Enable</b>.
          </div>
        </div>
        </li>
        <li>
          <div>
          <div className="ss-t">Configure the OAuth consent screen</div>
          <div className="ss-s">
            Search <code>OAuth consent screen</code> → pick <b>External</b> → fill in App name (e.g. The Warehouse), your email, and your email again at the bottom. Save and continue through the rest with defaults. On the <b>Test users</b> step, add your own email <i>and</i> your partner's. (Staying in "Testing" mode is fine — no review needed.)
          </div>
        </div>
        </li>
        <li>
          <div>
          <div className="ss-t">Create OAuth credentials</div>
          <div className="ss-s">
            Search <code>Credentials</code> → <b>+ Create credentials</b> → <b>OAuth client ID</b> →{" "}
            Application type <b>Web application</b>. Under <b>Authorized JavaScript origins</b>, click <b>+ Add URI</b> and paste:
            <div className="ss-code mono">{origin}</div>
            (If you later host this app on a different URL, add that one too.) Click Create.
          </div>
        </div>
        </li>
        <li>
          <div>
          <div className="ss-t">Copy the Client ID into the field above</div>
          <div className="ss-s">
            A popup will show your Client ID — it ends in <code>.apps.googleusercontent.com</code>. Copy it and paste it into the <b>Google OAuth Client ID</b> field above. Then click <b>Connect to Google</b>.
          </div>
        </div>
        </li>
        <li>
          <div>
          <div className="ss-t">Share the sheet with your partner</div>
          <div className="ss-s">
            In Google Sheets, click <b>Share</b> (top-right) → enter your partner's email → set to <b>Editor</b>. They'll then be able to connect using the same Client ID (or their own).
          </div>
        </div>
        </li>
      </ol>
      <div className="muted small" style={{ marginTop: 12 }}>
        <b>Heads-up:</b> the Client ID isn't a secret — it identifies your app, not your account. It's safe to share. Google won't bill you; the Sheets API has a generous free quota.
      </div>
    </div>
  );
}

Object.assign(window, {
  DashboardScreen, InventoryScreen, DetailScreen, EventsScreen, ReportsScreen, SettingsScreen,
  BarChart, ActivityRow, MiniStat, HelpModal, DemoBanner,
  ExpensesScreen, ShowBar, openPrintReport,
  InventoriesCard,
});

/* ======================= EXPENSES ======================= */

function ExpensesScreen() {
  const s = useStore();
  const [editing, setEditing] = useStateS(null); // expense | "new"
  const [filter, setFilter] = useStateS("all");

  const expenses = (s.expenses || []).slice();
  const filtered = filter === "all" ? expenses :
    filter === "no-event" ? expenses.filter((x) => !x.event) :
    expenses.filter((x) => x.category === filter);

  const total = filtered.reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const byCategory = expenses.reduce((acc, x) => {
    acc[x.category] = (acc[x.category] || 0) + (Number(x.amount) || 0);
    return acc;
  }, {});
  const cats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="toolbar">
        <div className="muted small">Track table fees, gas, hotels, supplies, shipping, food — anything that's a real cost of running this. These show up in event P&Ls and the bottom-line stat.</div>
        <div className="grow"></div>
        <button className="btn primary" onClick={() => setEditing("new")}>+ Add expense</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <Stat label="Total expenses" accent="loss" value={fmtMoney(total)}
          sub={filtered.length + " " + (filtered.length === 1 ? "entry" : "entries")} />
        <Stat label="Biggest category" accent="loss"
          value={cats[0] ? cats[0][0] : "—"}
          sub={cats[0] ? fmtMoney(cats[0][1]) : ""} />
        <Stat label="Avg per event" accent="loss"
          value={s.events.length ? fmtMoney(total / s.events.length) : "—"}
          sub={s.events.length + " events tracked"} />
      </div>

      <div className="toolbar" style={{ marginBottom: 14 }}>
        <button className={"chip" + (filter === "all" ? " active" : "")} onClick={() => setFilter("all")}>
          All <span className="mono" style={{ opacity: 0.6 }}>{expenses.length}</span>
        </button>
        {cats.map(([c, amt]) => (
          <button key={c} className={"chip" + (filter === c ? " active" : "")} onClick={() => setFilter(c)}>
            {c} <span className="mono" style={{ opacity: 0.6 }}>{fmtMoney(amt)}</span>
          </button>
        ))}
        <button className={"chip" + (filter === "no-event" ? " active" : "")} onClick={() => setFilter("no-event")}>
          Unassigned
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="t">No expenses yet.</div>
            <div className="small">Add your first one to start tracking real cost of operations.</div>
          </div>
        ) : (
          <>
            <div className="hide-on-mobile">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Event</th>
                    <th>Notes</th>
                    <th className="num">Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr key={x.id} className="row-link" onClick={() => setEditing(x)}>
                      <td className="mono muted small">{fmtDateShort(x.date)}</td>
                      <td>{x.category}</td>
                      <td className="muted small">{x.event || "—"}</td>
                      <td className="muted small" style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{x.notes || ""}</td>
                      <td className="num mono">{fmtMoney(x.amount)}</td>
                      <td className="right"><span className="muted small">edit →</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="show-on-mobile">
              {filtered.map((x) => (
                <div key={x.id} className="cardrow" onClick={() => setEditing(x)}>
                  <div>
                    <div className="ttl">{x.category}</div>
                    <div className="meta">
                      <span>{fmtDateShort(x.date)}</span>
                      {x.event ? <span>{x.event}</span> : null}
                    </div>
                    {x.notes && <div className="muted small" style={{ marginTop: 4 }}>{x.notes}</div>}
                  </div>
                  <div className="price">{fmtMoney(x.amount)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editing && (
        <ExpenseModal expense={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

/* ======================= SHOW BAR (sticky banner when show mode is on) ======================= */

function ShowBar({ onEnd }) {
  const s = useStore();
  const stats = PCT.sessionStats();
  if (!stats) return null;
  const started = new Date(stats.startedAt);
  const elapsed = Math.max(0, (Date.now() - started.getTime()) / 60000); // minutes
  const elapsedLabel = elapsed < 60 ? Math.round(elapsed) + "m" : Math.floor(elapsed / 60) + "h " + Math.round(elapsed % 60) + "m";

  return (
    <div className="show-bar">
      <div className="show-bar-dot"></div>
      <div className="show-bar-info">
        <div className="show-bar-title">
          Show mode — <b>{stats.event}</b>
          <span className="show-bar-time">started {elapsedLabel} ago</span>
        </div>
        <div className="show-bar-stats">
          <span><b className="mono">{stats.cardsSold}</b> sold</span>
          <span><b className="mono">{fmtMoney(stats.revenue)}</b> in</span>
          <span className={"mono " + profitClass(stats.profit)}><b>{fmtMoneySigned(stats.profit)}</b> profit</span>
          {stats.revenue > 0 && <span className="muted">{stats.margin.toFixed(0)}% margin</span>}
        </div>
      </div>
      <button className="btn" onClick={onEnd}>End show</button>
    </div>
  );
}

/* ======================= PRINT REPORT ======================= */

function openPrintReport() {
  const s = PCT.getState();
  const sum = PCT.summary();
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const onHand = s.cards.filter((c) => c.name && !c.status)
    .sort((a, b) => (b.paid || 0) - (a.paid || 0));
  const sold = s.cards.filter((c) => c.status === "Sold")
    .sort((a, b) => (b.dateOut || "").localeCompare(a.dateOut || ""));
  const expenses = (s.expenses || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const money = (n) => n == null || n === "" ? "—" : "$" + Math.round(Number(n)).toLocaleString();
  const moneyExact = (n) => n == null || n === "" ? "—" : "$" + Number(n).toFixed(2);
  const dateFmt = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

  function rowsCards(rows, opts) {
    return rows.map((c) => {
      const p = PCT.profit(c);
      const cells = [
        dateFmt(c.date),
        c.name,
        c.qty,
        moneyExact(c.paid),
      ];
      if (opts && opts.sold) {
        cells.push(dateFmt(c.dateOut), moneyExact(c.gotBack),
          p == null ? "—" : (p >= 0 ? "+$" : "−$") + Math.abs(p).toFixed(2));
      }
      cells.push(c.event || "—");
      return "<tr>" + cells.map((v) => "<td>" + (v == null ? "" : String(v).replace(/</g, "&lt;")) + "</td>").join("") + "</tr>";
    }).join("");
  }

  const headerOnHand = "<tr><th>Date</th><th>Card</th><th class='n'>Qty</th><th class='n'>Paid</th><th>Event</th></tr>";
  const headerSold = "<tr><th>Date in</th><th>Card</th><th class='n'>Qty</th><th class='n'>Paid</th><th>Date out</th><th class='n'>Got back</th><th class='n'>Profit</th><th>Event</th></tr>";
  const headerExp = "<tr><th>Date</th><th>Category</th><th>Event</th><th>Notes</th><th class='n'>Amount</th></tr>";
  const rowsExp = expenses.map((x) => (
    "<tr><td>" + dateFmt(x.date) + "</td><td>" + x.category + "</td><td>" + (x.event || "—") + "</td><td>" + (x.notes || "").replace(/</g, "&lt;") + "</td><td class='n'>" + moneyExact(x.amount) + "</td></tr>"
  )).join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<title>${s.settings.businessName || "The Warehouse"} — Inventory report ${today}</title>
<style>
  @page { size: letter; margin: 0.5in; }
  body { font: 11pt/1.4 -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1a1f2c; max-width: 7.5in; margin: 0 auto; padding: 24px 0; }
  h1 { font-size: 22pt; letter-spacing: -0.01em; margin: 0 0 4px; }
  h2 { font-size: 14pt; letter-spacing: -0.01em; margin: 28px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #d3d7df; }
  .sub { color: #6c7280; margin-bottom: 24px; }
  .totals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0 0; }
  .tile { border: 1px solid #d3d7df; border-radius: 8px; padding: 10px 12px; }
  .tile .l { font-size: 9pt; letter-spacing: 0.06em; text-transform: uppercase; color: #6c7280; }
  .tile .v { font: 600 16pt ui-monospace, "SF Mono", Menlo, monospace; margin-top: 4px; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 4px; }
  th { text-align: left; font-size: 8.5pt; letter-spacing: 0.06em; text-transform: uppercase; color: #6c7280; font-weight: 500; padding: 6px 8px; border-bottom: 1px solid #1a1f2c; }
  td { padding: 5px 8px; border-bottom: 1px solid #e8eaef; vertical-align: top; }
  td.n, th.n { text-align: right; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-variant-numeric: tabular-nums; }
  tr:last-child td { border-bottom: 0; }
  .signature { margin-top: 36px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .signature .sig { border-top: 1px solid #1a1f2c; padding-top: 6px; font-size: 9pt; color: #6c7280; }
  .footer { margin-top: 28px; font-size: 9pt; color: #6c7280; text-align: center; }
  @media print { .noprint { display: none; } body { padding: 0; } }
  .noprint { background: #f5f5f0; border: 1px solid #d3d7df; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: flex; gap: 10px; align-items: center; }
  .noprint button { font: inherit; padding: 6px 12px; border-radius: 6px; border: 1px solid #1a1f2c; background: #1a1f2c; color: #fff; cursor: pointer; }
</style></head>
<body>
  <div class="noprint">
    <div style="flex:1">Use <b>Cmd/Ctrl+P</b> to save as PDF.</div>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>

  <h1>${s.settings.businessName || "The Warehouse"} — Inventory report</h1>
  <div class="sub">Prepared ${today}</div>

  <div class="totals">
    <div class="tile"><div class="l">Cards on hand</div><div class="v">${sum.cardsOnHand}</div></div>
    <div class="tile"><div class="l">Inventory value</div><div class="v">${money(sum.moneyTiedUp)}</div></div>
    <div class="tile"><div class="l">Lifetime profit</div><div class="v">${money(sum.profitFromSales)}</div></div>
    <div class="tile"><div class="l">Lifetime margin</div><div class="v">${sum.margin.toFixed(0)}%</div></div>
  </div>

  <h2>On hand — ${onHand.length} ${onHand.length === 1 ? "row" : "rows"}, ${money(sum.moneyTiedUp)} basis</h2>
  ${onHand.length ? `<table>${headerOnHand}<tbody>${rowsCards(onHand, {})}</tbody></table>` : "<p>Nothing on hand.</p>"}

  <h2>Sold this period — ${sold.length} rows, ${money(sum.revenue)} revenue, ${money(sum.profitFromSales)} profit</h2>
  ${sold.length ? `<table>${headerSold}<tbody>${rowsCards(sold, { sold: true })}</tbody></table>` : "<p>No sales yet.</p>"}

  <h2>Expenses — ${expenses.length} entries, ${money(sum.expenses)} total</h2>
  ${expenses.length ? `<table>${headerExp}<tbody>${rowsExp}</tbody></table>` : "<p>No expenses logged.</p>"}

  <div class="signature">
    <div class="sig">Prepared by</div>
    <div class="sig">Reviewed by</div>
  </div>

  <div class="footer">${s.settings.businessName || "The Warehouse"} · Generated ${today} · Page 1</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.open();
    w.document.write(html);
    w.document.close();
  } else {
    alert("Pop-up was blocked. Allow pop-ups for this site to open the report.");
  }
}

/* ======================= DEMO BANNER ======================= */

function DemoBanner({ onClear, onDismiss, cardCount, eventCount }) {
  return (
    <div className="demo-banner">
      <div className="db-mark">demo</div>
      <div className="db-text">
        <div className="db-t">Heads up — this is demo data.</div>
        <div className="db-s">{cardCount} cards and {eventCount} events are seeded so you can poke around. Wipe them whenever you're ready to start tracking for real.</div>
      </div>
      <div className="db-actions">
        <button className="btn" onClick={onDismiss}>Keep for now</button>
        <button className="btn primary" onClick={onClear}>Clear demo & start fresh</button>
      </div>
    </div>
  );
}

/* ======================= HELP MODAL ======================= */

const HELP_TOPICS = [
  {
    id: "start",
    title: "Welcome",
    body: () => (
      <div className="flexcol" style={{ gap: 14 }}>
        <p style={{ margin: 0 }}>
          This app is your card-vending business in your pocket — same data your Excel sheet tracks, but built for the table at a con and your couch at home.
        </p>
        <p style={{ margin: 0 }}>
          Five scenarios cover almost everything. Each topic on the left walks through one. Tap around — nothing's destructive, and you can always wipe the demo data from <b>Settings</b>.
        </p>
        <div className="help-cards">
          <div className="hc"><div className="hc-g">+</div><div><b>Add a card</b><div className="muted small">You bought something</div></div></div>
          <div className="hc"><div className="hc-g">$</div><div><b>Mark out</b><div className="muted small">Sold, traded, or gave it away</div></div></div>
          <div className="hc"><div className="hc-g">÷</div><div><b>Split a lot</b><div className="muted small">Bought a binder/box</div></div></div>
          <div className="hc"><div className="hc-g">◇</div><div><b>Events</b><div className="muted small">Per-con P&L</div></div></div>
        </div>
      </div>
    ),
  },
  {
    id: "add",
    title: "Bought a card",
    body: () => (
      <div className="flexcol" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>Tap <b>+ Add card</b> (top bar on desktop, the round button on phone, or the sidebar shortcut). Fill in:</p>
        <ul className="help-list">
          <li><b>Card</b> — name + set/number, however you remember it</li>
          <li><b>Quantity & Paid</b> — how many and what you paid total</li>
          <li><b>Date</b> — defaults to today</li>
          <li><b>Event</b> — optional tag if you picked it up at a specific show</li>
        </ul>
        <p style={{ margin: 0 }}>That's it — the card now counts as inventory and shows up in <b>Money tied up</b> on the dashboard.</p>
      </div>
    ),
  },
  {
    id: "sell",
    title: "Sold / traded / gave it away",
    body: () => (
      <div className="flexcol" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>Open the card (tap its row in <b>Inventory</b>) and hit <b>Mark out</b>. Pick what happened:</p>
        <ul className="help-list">
          <li><b>Sold</b> — enter what you got back. Profit calculates automatically.</li>
          <li><b>Traded</b> — enter the $ value of what you received. Then add a new card for what you got (Paid = that same value).</li>
          <li><b>Given Away</b> — for kid giveaways. Counts as a giveaway cost, not a loss.</li>
          <li><b>Keeping</b> — pulled it for your own collection. Removed from inventory & profit.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "lot",
    title: "Bought a lot or binder",
    body: () => (
      <div className="flexcol" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>Use <b>Split a lot</b> when you bought a bundle (binder, box, collection). Enter:</p>
        <ul className="help-list">
          <li>Total you paid</li>
          <li>Number of "hits" (cards worth tracking individually)</li>
        </ul>
        <p style={{ margin: 0 }}>
          It creates one row per hit at the calculated <b>basis-per-hit</b>, plus one bulk row at $0 (so any sale on the bulk = pure profit).
        </p>
        <div className="muted small">
          Heads up: if a hit later sells below its basis, that row shows a paper loss even though the whole lot made money. Totals still come out right.
        </div>
      </div>
    ),
  },
  {
    id: "events",
    title: "Cons & events",
    body: () => (
      <div className="flexcol" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>Each con or show gets its own <b>P&L</b>. Add events in the <b>Events</b> tab with name, date, location, and table fee.</p>
        <p style={{ margin: 0 }}>
          When you add a card or mark one sold, pick the event from the dropdown. The event page then shows revenue, COGS, table fee, giveaway cost, and net profit for that specific show.
        </p>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "Reading the dashboard",
    body: () => (
      <div className="flexcol" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>Three groups, same as your Excel:</p>
        <ul className="help-list">
          <li><b>Inventory</b> — cards on hand and cash tied up</li>
          <li><b>Performance</b> — cards sold, lifetime profit, trade net</li>
          <li><b>Giveaways</b> — cards given to kids and what they cost</li>
        </ul>
        <p style={{ margin: 0 }}>The green bars at the bottom are monthly profit. The activity feed shows your most recent moves — tap any row to jump to the card.</p>
      </div>
    ),
  },
  {
    id: "taxes",
    title: "Month-end snapshots (for taxes)",
    body: () => (
      <div className="flexcol" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>On the 1st of each month, head to <b>Settings → Month-end snapshots</b> and tap <b>Take snapshot now</b>.</p>
        <p style={{ margin: 0 }}>
          A snapshot freezes your current inventory + totals into a dated, read-only record. Use it for taxes, audits, and clean monthly reporting. You can also export your live inventory to CSV anytime.
        </p>
      </div>
    ),
  },
  {
    id: "inventories",
    title: "Multiple inventories",
    body: () => (
      <div className="flexcol" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>
          Each <b>inventory</b> is a completely separate set of cards, events, expenses, and snapshots — with its own Google Sheet link. Use one per business line, partner, or project.
        </p>
        <ul className="help-list">
          <li><b>Switch</b> — click the <b>Inventory</b> pill at the top of the sidebar; pick from the dropdown.</li>
          <li><b>New</b> — same dropdown → <b>+ New inventory</b>. Give it a name (and optionally paste a Google Sheet URL).</li>
          <li><b>Rename</b> — hover any row in the dropdown and click the <b>✎</b> pencil, or use <b>Settings → Inventories</b>.</li>
          <li><b>Delete</b> — <b>Settings → Inventories → Delete</b>. Removes that inventory's data on this device (the Google Sheet itself is untouched).</li>
        </ul>
        <div className="muted small">
          The sidebar shows totals for the inventory you're currently viewing — switching is instant and your data is kept separate per inventory.
        </div>
      </div>
    ),
  },
  {
    id: "sheets",
    title: "Google Sheets sync (first-time setup)",
    body: () => (
      <div className="flexcol" style={{ gap: 14 }}>
        <p style={{ margin: 0 }}>
          By default your data lives only in this browser. Connecting a Google Sheet lets you back it up, share with a partner, and view your inventory anywhere. Setup takes ~5 minutes and is one-time per device.
        </p>

        <div style={{
          background: "var(--paper-2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "12px 14px",
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Before you start, you'll need:</div>
          <ul className="help-list" style={{ marginBottom: 0 }}>
            <li>A <b>Google account</b> (the one you want the data under)</li>
            <li>A <b>blank Google Sheet</b> — name it whatever, e.g. "Card Inventory"</li>
            <li>About 5 minutes for the one-time Google Cloud setup</li>
          </ul>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>The 4 steps, in plain English:</div>
          <ol className="help-list" style={{ paddingLeft: 22, lineHeight: 1.6 }}>
            <li>
              <b>Create a blank Google Sheet</b> at <a href="https://sheets.new" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>sheets.new</a>. Copy its URL from your browser's address bar.
            </li>
            <li>
              <b>Get a Google Client ID</b> (the only "techy" step). This tells Google our app is allowed to talk to your sheet. Settings has a full walkthrough — open <b>Settings → Google Sheets sync → How do I get the Client ID?</b> for the exact 5-click path through Google Cloud Console. You only do this once per device.
            </li>
            <li>
              <b>Paste both into Settings:</b>
              <ul className="help-list" style={{ marginTop: 4 }}>
                <li>Your Sheet URL into <b>Google Sheet URL</b></li>
                <li>The Client ID (ends in <code>.apps.googleusercontent.com</code>) into <b>Google OAuth Client ID</b></li>
              </ul>
            </li>
            <li>
              <b>Click "Connect to Google"</b>, sign in, then click <b>Initialize sheet</b> (one-time — adds the Cards / Events tabs with headers) and <b>↑ Push to sheet</b> to upload your current data.
            </li>
          </ol>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Day-to-day after setup:</div>
          <ul className="help-list">
            <li><b>↑ Push</b> — uploads everything from this device to the sheet (overwrites the sheet's rows).</li>
            <li><b>↓ Pull</b> — replaces this device's data with what's in the sheet. Useful if your partner made edits.</li>
            <li>The app does <b>not</b> auto-sync — you decide when. Push after a show; pull before one.</li>
          </ul>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Sharing with a partner:</div>
          <ul className="help-list">
            <li>In Google Sheets click <b>Share</b> → enter their email → set as <b>Editor</b>.</li>
            <li>They install this app, paste the <b>same Sheet URL</b>, and use either the same Client ID or create their own.</li>
            <li>One of you pushes, the other pulls — the sheet is the source of truth.</li>
          </ul>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Multiple inventories?</div>
          <p style={{ margin: 0 }}>
            Each inventory has its <b>own</b> Sheet URL — link a different blank sheet to each one. The Client ID is shared across all inventories (it identifies the app, not the data).
          </p>
        </div>

        <div className="muted small" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          <b>Common gotchas:</b> Make sure to add yourself as a <b>Test user</b> in the OAuth consent screen, or sign-in will fail. The Client ID isn't a secret — it identifies the app, not your account. Google's Sheets API is free for personal use.
        </div>
      </div>
    ),
  },
];

function HelpModal({ onClose, initialTopic = "start" }) {
  const [topic, setTopic] = useStateS(initialTopic);
  const current = HELP_TOPICS.find((t) => t.id === topic) || HELP_TOPICS[0];
  const idx = HELP_TOPICS.findIndex((t) => t.id === topic);
  const next = HELP_TOPICS[idx + 1];
  const prev = HELP_TOPICS[idx - 1];

  return (
    <Modal title="Help & guide" onClose={onClose} wide
      footer={
        <>
          <button className="btn" disabled={!prev} onClick={() => prev && setTopic(prev.id)}>← {prev?.title || "Back"}</button>
          <div style={{ flex: 1 }} />
          {next ? (
            <button className="btn primary" onClick={() => setTopic(next.id)}>{next.title} →</button>
          ) : (
            <button className="btn primary" onClick={onClose}>Got it</button>
          )}
        </>
      }
    >
      <div className="help-grid">
        <div className="help-toc">
          {HELP_TOPICS.map((t, i) => (
            <button key={t.id}
              className={"help-toc-item" + (t.id === topic ? " active" : "")}
              onClick={() => setTopic(t.id)}>
              <span className="help-toc-n mono">{String(i + 1).padStart(2, "0")}</span>
              <span>{t.title}</span>
            </button>
          ))}
        </div>
        <div className="help-body">
          <h3 className="help-h">{current.title}</h3>
          <div className="help-content">{current.body()}</div>
        </div>
      </div>
    </Modal>
  );
}
