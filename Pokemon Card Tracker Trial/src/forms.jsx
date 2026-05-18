/* global React, PCT */
/* Forms: AddCardModal, SellModal, EventModal, LotSplitter */

const { useState: useStateF, useEffect: useEffectF } = React;

function AddCardModal({ onClose, onAdded, presetEvent }) {
  const s = useStore();
  const [form, setForm] = useStateF({
    date: PCT.todayISO(),
    name: "",
    qty: 1,
    paid: "",
    notes: "",
    event: presetEvent || s.session?.event || "",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.name.trim().length > 0;

  function save() {
    if (!canSave) return;
    const id = PCT.addCard(form);
    onAdded && onAdded(id);
    onClose();
  }

  return (
    <Modal
      title="Add a card"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!canSave} onClick={save}>Add card</button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <Field label="Card">
          <input className="input" autoFocus placeholder="e.g. Charizard ex 199/197 (Obsidian Flames)"
            value={form.name} onChange={(e) => set("name")(e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="Quantity">
            <input className="input mono" type="number" min="1" value={form.qty}
              onChange={(e) => set("qty")(e.target.value)} />
          </Field>
          <Field label="Paid">
            <MoneyInput value={form.paid} onChange={set("paid")} />
          </Field>
        </div>
        <div className="field-row">
          <Field label="Date bought">
            <input className="input mono" type="date" value={form.date}
              onChange={(e) => set("date")(e.target.value)} />
          </Field>
          <Field label="Event (optional)">
            <select className="select" value={form.event}
              onChange={(e) => set("event")(e.target.value)}>
              <option value="">— none —</option>
              {s.events.map((ev) => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="textarea" placeholder="Where you got it, condition, anything to remember…"
            value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function SellModal({ card, onClose }) {
  const s = useStore();
  const [status, setStatus] = useStateF("Sold");
  const [dateOut, setDateOut] = useStateF(PCT.todayISO());
  const [gotBack, setGotBack] = useStateF("");
  const [event, setEvent] = useStateF(s.session?.event || card.event || "");
  const [notes, setNotes] = useStateF(card.notes || "");

  const profit = status === "Sold" || status === "Traded"
    ? (Number(gotBack || 0) - Number(card.paid || 0))
    : status === "Given Away" ? -(Number(card.paid || 0)) : 0;

  function save() {
    const patch = { status, dateOut: status === "Keeping" ? null : dateOut, notes, event: event || null };
    if (status === "Sold" || status === "Traded") patch.gotBack = gotBack === "" ? 0 : Number(gotBack);
    else patch.gotBack = null;
    PCT.updateCard(card.id, patch);
    onClose();
  }

  return (
    <Modal
      title={"Mark out — " + card.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <Field label="What happened?">
          <div className="flexrow">
            {["Sold", "Traded", "Given Away", "Keeping"].map((opt) => (
              <button key={opt}
                className={"chip" + (status === opt ? " active" : "")}
                onClick={() => setStatus(opt)}>{opt}</button>
            ))}
          </div>
        </Field>

        {status !== "Keeping" && (
          <div className="field-row">
            <Field label="Date out">
              <input className="input mono" type="date" value={dateOut}
                onChange={(e) => setDateOut(e.target.value)} />
            </Field>
            {(status === "Sold" || status === "Traded") ? (
              <Field label={status === "Traded" ? "$ value received" : "Got back"}>
                <MoneyInput value={gotBack} onChange={setGotBack} autoFocus />
              </Field>
            ) : (
              <Field label="Event (optional)">
                <select className="select" value={event} onChange={(e) => setEvent(e.target.value)}>
                  <option value="">— none —</option>
                  {s.events.map((ev) => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
                </select>
              </Field>
            )}
          </div>
        )}

        {(status === "Sold" || status === "Traded") && (
          <Field label="Event (optional)">
            <select className="select" value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="">— none —</option>
              {s.events.map((ev) => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
            </select>
          </Field>
        )}

        {(status === "Sold" || status === "Traded" || status === "Given Away") && (
          <div className="card" style={{ background: "var(--paper-2)" }}>
            <div className="card-b" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div className="muted small">Profit on this row</div>
              <div className={"mono tnum " + profitClass(profit)} style={{ fontSize: 22, fontWeight: 500 }}>
                {fmtMoneySigned(profit)}
              </div>
            </div>
          </div>
        )}

        <Field label="Notes">
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function EventModal({ event, onClose }) {
  const isNew = !event;
  const [form, setForm] = useStateF(event || { name: "", date: PCT.todayISO(), location: "", tableFee: 0 });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  function save() {
    if (!form.name.trim()) return;
    if (isNew) PCT.addEvent(form);
    else PCT.updateEvent(event.id, form);
    onClose();
  }
  return (
    <Modal title={isNew ? "Add an event" : "Edit event"} onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button className="btn danger" onClick={() => { PCT.deleteEvent(event.id); onClose(); }}>Delete</button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <Field label="Event name">
          <input className="input" autoFocus value={form.name} onChange={(e) => set("name")(e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="Date">
            <input className="input mono" type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} />
          </Field>
          <Field label="Table fee">
            <MoneyInput value={form.tableFee} onChange={set("tableFee")} />
          </Field>
        </div>
        <Field label="Location">
          <input className="input" placeholder="City, venue, etc."
            value={form.location} onChange={(e) => set("location")(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function LotSplitter({ onClose, defaultPaid = "", defaultHits = "" }) {
  const [paid, setPaid] = useStateF(defaultPaid);
  const [hits, setHits] = useStateF(defaultHits);
  const [date, setDate] = useStateF(PCT.todayISO());
  const [lotName, setLotName] = useStateF("");
  const basis = PCT.basisPerHit(paid, hits);

  function create() {
    if (!paid || !hits) return;
    const baseName = lotName.trim() || "Lot " + date;
    const n = parseInt(hits, 10);
    for (let i = 1; i <= n; i++) {
      PCT.addCard({
        date,
        name: baseName + " — hit #" + i,
        qty: 1,
        paid: Math.round(basis * 100) / 100,
        notes: "From " + baseName + " ($" + Number(paid).toLocaleString() + " / " + n + " hits)",
      });
    }
    // Bulk row
    PCT.addCard({
      date,
      name: baseName + " — bulk (rest of lot)",
      qty: 1,
      paid: 0,
      notes: "Bulk portion of " + baseName + " — any sale = pure profit.",
    });
    onClose();
  }

  return (
    <Modal title="Lot / binder splitter" onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!paid || !hits} onClick={create}>
            Create {hits || 0} hit rows + 1 bulk row
          </button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <div className="muted small">
          Bought a binder or lot? Type the total and the number of hits — basis-per-hit appears below.
          We'll create one row per hit (with the basis) plus one bulk row at $0.
        </div>
        <Field label="Lot name">
          <input className="input" placeholder="e.g. Mike's binder pickup"
            value={lotName} onChange={(e) => setLotName(e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="Date">
            <input className="input mono" type="date" value={date}
              onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Total paid for lot">
            <MoneyInput value={paid} onChange={setPaid} />
          </Field>
        </div>
        <Field label="Number of hits in the lot">
          <input className="input mono" type="number" min="1"
            value={hits} onChange={(e) => setHits(e.target.value)} />
        </Field>

        <div className="card" style={{ background: "var(--paper-2)" }}>
          <div className="card-b">
            <div className="kv">
              <div className="k">Basis per hit</div>
              <div className="v">{paid && hits ? "$" + basis.toFixed(2) : "—"}</div>
              <div className="k">Bulk row basis</div>
              <div className="v">$0</div>
            </div>
            <div className="small muted" style={{ marginTop: 10 }}>
              Heads up: if a hit later sells below its basis, that row shows a paper loss even though the whole lot made money. Totals still come out right.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SellPickerModal({ onClose, onPick }) {
  const s = useStore();
  const [q, setQ] = useStateF("");
  const onHand = s.cards.filter((c) => c.name && !c.status);
  const filtered = q ? onHand.filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase())) : onHand;

  return (
    <Modal title="Sell a card — pick one"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 12 }}>
        <div className="muted small">
          Pick a card from your on-hand inventory. Next screen sets the sale details.
        </div>
        <div className="search">
          <span className="glyph">⌕</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search on-hand cards…" />
        </div>
        <div className="card" style={{ maxHeight: 380, overflow: "auto" }}>
          {filtered.length === 0 ? (
            <div className="empty">
              <div className="t">Nothing on hand{q ? " matches that" : ""}.</div>
              <div className="small">{q ? "Try a different search." : "Add a card first."}</div>
            </div>
          ) : filtered.map((c) => (
            <button key={c.id} className="cardrow" style={{ width: "100%", textAlign: "left" }}
              onClick={() => onPick(c)}>
              <div>
                <div className="ttl">{c.name}</div>
                <div className="meta">
                  <span>{c.qty}×</span>
                  <span>paid {fmtMoney(c.paid)}</span>
                  {c.event ? <span>{c.event}</span> : null}
                </div>
              </div>
              <div>
                <div className="price">{fmtMoney(c.paid)}</div>
                <div className="pl">on hand</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TradePickerModal({ onClose, onPick }) {
  const s = useStore();
  const [q, setQ] = useStateF("");
  const onHand = s.cards.filter((c) => c.name && !c.status);
  const filtered = q ? onHand.filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase())) : onHand;
  return (
    <Modal title="Trade a card — pick what you're giving up" onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Cancel</button>}>
      <div className="flexcol" style={{ gap: 12 }}>
        <div className="muted small">
          Pick a card from your on-hand inventory. Next screen captures the trade — what you gave, what you got back.
        </div>
        <div className="search">
          <span className="glyph">⌕</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search on-hand cards…" />
        </div>
        <div className="card" style={{ maxHeight: 380, overflow: "auto" }}>
          {filtered.length === 0 ? (
            <div className="empty"><div className="t">Nothing on hand{q ? " matches" : ""}.</div></div>
          ) : filtered.map((c) => (
            <button key={c.id} className="cardrow" style={{ width: "100%", textAlign: "left" }}
              onClick={() => onPick(c)}>
              <div>
                <div className="ttl">{c.name}</div>
                <div className="meta"><span>{c.qty}×</span><span>paid {fmtMoney(c.paid)}</span></div>
              </div>
              <div><div className="price">{fmtMoney(c.paid)}</div><div className="pl">on hand</div></div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function TradeModal({ card, onClose }) {
  const s = useStore();
  const [date, setDate] = useStateF(PCT.todayISO());
  const [value, setValue] = useStateF("");
  const [incoming, setIncoming] = useStateF([{ name: "", qty: 1 }]);
  const [event, setEvent] = useStateF(s.session?.event || card.event || "");
  const [notes, setNotes] = useStateF("");

  const totalQty = incoming.reduce((a, r) => a + (Number(r.qty) || 0), 0) || 1;
  const valueNum = Number(value) || 0;
  const basisPer = totalQty ? valueNum / totalQty : 0;
  const profit = valueNum - (Number(card.paid) || 0);

  function updateRow(i, k, v) {
    setIncoming((rows) => rows.map((r, j) => j === i ? { ...r, [k]: v } : r));
  }
  function addRow() { setIncoming((r) => [...r, { name: "", qty: 1 }]); }
  function removeRow(i) { setIncoming((r) => r.length === 1 ? r : r.filter((_, j) => j !== i)); }

  function save() {
    // Mark the outgoing card as Traded
    PCT.updateCard(card.id, {
      status: "Traded",
      dateOut: date,
      gotBack: valueNum,
      notes: notes ? card.notes + (card.notes ? " · " : "") + notes : card.notes,
      event: event || card.event || null,
    });
    // Add each incoming card at the per-row basis
    const valid = incoming.filter((r) => r.name.trim());
    if (valid.length) {
      const perRowQty = valid.reduce((a, r) => a + (Number(r.qty) || 0), 0) || 1;
      valid.forEach((r) => {
        const portion = ((Number(r.qty) || 0) / perRowQty) * valueNum;
        PCT.addCard({
          date,
          name: r.name.trim(),
          qty: Number(r.qty) || 1,
          paid: Math.round(portion * 100) / 100,
          notes: "From trade — gave " + card.name,
          event: event || null,
        });
      });
    }
    onClose();
  }

  return (
    <Modal
      title={"Trade — " + card.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!value} onClick={save}>Save trade</button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <div className="card" style={{ background: "var(--paper-2)" }}>
          <div className="card-b">
            <div className="muted small">You're giving up</div>
            <div style={{ fontWeight: 500, marginTop: 2 }}>{card.name}</div>
            <div className="muted small">Cost basis {fmtMoney(card.paid)}</div>
          </div>
        </div>
        <div className="field-row">
          <Field label="Date">
            <input className="input mono" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Total $ value received">
            <MoneyInput value={value} onChange={setValue} autoFocus />
          </Field>
        </div>
        <Field label="Event (optional)">
          <select className="select" value={event} onChange={(e) => setEvent(e.target.value)}>
            <option value="">— none —</option>
            {s.events.map((ev) => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
          </select>
        </Field>

        <div>
          <label style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500 }}>
            Cards you received
          </label>
          <div className="flexcol" style={{ gap: 8, marginTop: 6 }}>
            {incoming.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px auto", gap: 8 }}>
                <input className="input" placeholder="Card name" value={row.name}
                  onChange={(e) => updateRow(i, "name", e.target.value)} />
                <input className="input mono" type="number" min="1" value={row.qty}
                  onChange={(e) => updateRow(i, "qty", e.target.value)} />
                <button className="btn sm" onClick={() => removeRow(i)} disabled={incoming.length === 1}>✕</button>
              </div>
            ))}
            <button className="btn sm ghost" style={{ alignSelf: "flex-start" }} onClick={addRow}>+ Another card</button>
          </div>
        </div>

        {value && (
          <div className="card" style={{ background: "var(--paper-2)" }}>
            <div className="card-b">
              <div className="kv">
                <div className="k">Outgoing basis</div><div className="v">{fmtMoney(card.paid)}</div>
                <div className="k">Trade-in value</div><div className="v">{fmtMoney(valueNum)}</div>
                <div className="k">Profit on this trade</div><div className={"v " + profitClass(profit)}>{fmtMoneySigned(profit)}</div>
                <div className="k">Avg basis per received qty</div><div className="v">{totalQty ? "$" + basisPer.toFixed(2) : "—"}</div>
              </div>
            </div>
          </div>
        )}

        <Field label="Notes">
          <textarea className="textarea" placeholder="Who you traded with, etc."
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function ExpenseModal({ expense, onClose }) {
  const s = useStore();
  const isNew = !expense;
  const [form, setForm] = useStateF(expense || {
    date: PCT.todayISO(), category: "Travel", amount: "", event: s.session?.event || "", notes: "",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  function save() {
    if (!form.amount) return;
    if (isNew) PCT.addExpense(form);
    else PCT.updateExpense(expense.id, form);
    onClose();
  }
  return (
    <Modal title={isNew ? "Add an expense" : "Edit expense"} onClose={onClose}
      footer={
        <>
          {!isNew && <button className="btn danger" onClick={() => { PCT.deleteExpense(expense.id); onClose(); }}>Delete</button>}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!form.amount} onClick={save}>Save</button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <div className="field-row">
          <Field label="Date"><input className="input mono" type="date" value={form.date} onChange={(e) => set("date")(e.target.value)} /></Field>
          <Field label="Amount"><MoneyInput value={form.amount} onChange={set("amount")} autoFocus /></Field>
        </div>
        <div className="field-row">
          <Field label="Category">
            <select className="select" value={form.category} onChange={(e) => set("category")(e.target.value)}>
              {["Travel", "Lodging", "Food", "Supplies", "Shipping", "Table fee", "Marketing", "Fees", "Other"].map((c) =>
                <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Event (optional)">
            <select className="select" value={form.event || ""} onChange={(e) => set("event")(e.target.value || null)}>
              <option value="">— none —</option>
              {s.events.map((ev) => <option key={ev.id} value={ev.name}>{ev.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="textarea" placeholder="Gas, supplies vendor, anything to remember…"
            value={form.notes} onChange={(e) => set("notes")(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function StartShowModal({ onClose }) {
  const s = useStore();
  const [eventName, setEventName] = useStateF(s.events[0]?.name || "");
  return (
    <Modal title="Start show mode" onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!eventName} onClick={() => { PCT.startShow(eventName); onClose(); }}>
            Start show
          </button>
        </>
      }
    >
      <div className="flexcol" style={{ gap: 14 }}>
        <div className="muted small">
          Show mode auto-tags every card you Add, Sell, or Trade with this event, and keeps a live tally at the top of the app. Tap <b>End show</b> when you're done to capture the session.
        </div>
        <Field label="Which show?">
          <select className="select" value={eventName} onChange={(e) => setEventName(e.target.value)}>
            {s.events.length === 0 && <option value="">No events yet — add one first</option>}
            {s.events.map((ev) => <option key={ev.id} value={ev.name}>{ev.name} — {ev.location}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

Object.assign(window, {
  AddCardModal, SellModal, EventModal, LotSplitter, SellPickerModal,
  TradePickerModal, TradeModal, ExpenseModal, StartShowModal,
});
