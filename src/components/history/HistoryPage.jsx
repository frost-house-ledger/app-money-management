import React from "react";
import { formatCurrency } from "../../lib/currency.js";

function parsePayload(payloadJson) {
  try { return JSON.parse(payloadJson || "{}"); } catch { return {}; }
}

function EntryLine({ data, selectedCurrency, exchangeRates, faded = false }) {
  if (!data) return null;
  const cls = `history-entry-line${faded ? " history-entry-line--faded" : ""}`;
  return (
    <span className={cls}>
      {data.categoryIcon ? `${data.categoryIcon} ` : ""}
      <strong>{data.title}</strong>
      {" · "}
      {formatCurrency(data.amount, selectedCurrency, exchangeRates)}
      {" · "}
      {data.entryDate || ""}
      {data.note ? ` · 📝 ${data.note}` : ""}
    </span>
  );
}

function ActionBadge({ action, t }) {
  const label =
    action === "update" ? t.historyActionUpdate :
    action === "delete" ? t.historyActionDelete :
    t.historyActionAdd;
  const cls =
    action === "update" ? "history-badge history-badge--update" :
    action === "delete" ? "history-badge history-badge--delete" :
    "history-badge history-badge--add";
  return <span className={cls}>{label}</span>;
}

export default function HistoryPage({ historyRows, selectedCurrency, exchangeRates, t }) {
  return (
    <section className="lists-grid">
      <article className="card">
        <h2>{t.historyTitle}</h2>
        <p className="subtext">{t.historySubtext}</p>
        {historyRows.length === 0 ? (
          <p>{t.historyEmpty}</p>
        ) : (
          <ul className="list history-list">
            {historyRows.map((row) => {
              const payload = parsePayload(row.payloadJson);
              const before = payload.before;
              const after = payload.after;

              return (
                <li key={`history-${row.id}`} className="history-item">
                  <div className="history-item-header">
                    <span className="history-item-time">{row.loggedAt}</span>
                    <ActionBadge action={row.action} t={t} />
                    <span className="history-item-source">
                      {row.source === "monthly" ? t.historySourceMonthly : t.historySourceDaily}
                    </span>
                  </div>

                  <div className="history-item-body">
                    {/* add */}
                    {row.action === "add" && (
                      <EntryLine
                        data={{ title: row.title, amount: row.amount, entryDate: row.targetDate, categoryIcon: row.categoryIcon, note: row.note }}
                        selectedCurrency={selectedCurrency}
                        exchangeRates={exchangeRates}
                      />
                    )}

                    {/* update: before → after */}
                    {row.action === "update" && (
                      <>
                        <EntryLine data={before} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} faded />
                        <span className="history-arrow">→</span>
                        <EntryLine data={after} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} />
                      </>
                    )}

                    {/* delete: before → delete */}
                    {row.action === "delete" && (
                      <>
                        <EntryLine data={before} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} faded />
                        <span className="history-arrow history-arrow--delete">→ {t.historyActionDelete}</span>
                      </>
                    )}

                    {/* fallback: payload old log */}
                    {row.action !== "add" && !before && (
                      <EntryLine
                        data={{ title: row.title, amount: row.amount, entryDate: row.targetDate, categoryIcon: row.categoryIcon, note: row.note }}
                        selectedCurrency={selectedCurrency}
                        exchangeRates={exchangeRates}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </section>
  );
}
