/* global React, ReactDOM, PCT */
/* Shared UI primitives and helpers used across screens. */

const { useState, useEffect, useMemo, useCallback, useRef } = React;

function useStore() {
  const [s, setS] = useState(PCT.getState());
  useEffect(() => PCT.subscribe(setS), []);
  return s;
}

function fmtMoney(n, opts = {}) {
  if (n == null || n === "") return opts.dash ? "—" : "$0";
  const v = Math.round(Number(n));
  const sign = v < 0 ? "−" : "";
  return sign + "$" + Math.abs(v).toLocaleString();
}
function fmtMoneySigned(n) {
  if (n == null || n === "") return "—";
  const v = Math.round(Number(n));
  if (v === 0) return "$0";
  return (v > 0 ? "+$" : "−$") + Math.abs(v).toLocaleString();
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" });
}
function fmtDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtMonth(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}
function profitClass(n) {
  if (n == null) return "pl-zero";
  if (n > 0) return "pl-pos";
  if (n < 0) return "pl-neg";
  return "pl-zero";
}

const STATUSES = ["", "Sold", "Traded", "Given Away", "Keeping"];
function statusLabel(s) {
  return s || "On hand";
}
function statusBadgeClass(s) {
  if (!s) return "badge on-hand";
  if (s === "Sold") return "badge sold";
  if (s === "Traded") return "badge trade";
  if (s === "Given Away") return "badge given";
  if (s === "Keeping") return "badge keep";
  return "badge on-hand";
}

function StatusBadge({ status }) {
  return (
    <span className={statusBadgeClass(status)}>
      <span className="bd"></span>
      {statusLabel(status)}
    </span>
  );
}

function Stat({ label, value, sub, accent, mono = true }) {
  return (
    <div className={"stat accent-" + (accent || "ink")}>
      <div className="label"><span className="dot"></span>{label}</div>
      <div className={mono ? "v" : "v"} style={{ fontFamily: mono ? undefined : "var(--font-sans)" }}>{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" style={wide ? { width: "min(720px, 100%)" } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div style={{ fontWeight: 600 }}>{title}</div>
          <button className="btn ghost sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-b">{children}</div>
        {footer ? <div className="modal-f">{footer}</div> : null}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint ? <div className="small muted">{hint}</div> : null}
    </div>
  );
}

function MoneyInput({ value, onChange, placeholder, autoFocus }) {
  return (
    <div className="input-prefix">
      <span className="pf">$</span>
      <input
        className="input mono"
        type="number"
        step="0.01"
        placeholder={placeholder || "0"}
        value={value ?? ""}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

Object.assign(window, {
  useStore, fmtMoney, fmtMoneySigned, fmtDate, fmtDateShort, fmtMonth,
  profitClass, STATUSES, statusLabel, statusBadgeClass,
  StatusBadge, Stat, Modal, Field, MoneyInput,
});
