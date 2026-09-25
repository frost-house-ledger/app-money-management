import React from "react";
import { logError } from "../../lib/logger.js";
import { formatCurrency } from "../../lib/currency.js";
import { matchesEntryFilter } from "../../lib/entryFilters.js";

function parsePayload(payloadJson) {
  try {
    return JSON.parse(payloadJson || "{}");
  } catch (e) {
    logError("HistoryPage.parsePayload", e);
    return {};
  }
}

function splitLoggedAt(loggedAt) {
  const [date = "", time = ""] = String(loggedAt || "").replace("T", " ").split(/\s+/, 2);
  return { date, time };
}

function EntryLine({ data, selectedCurrency, exchangeRates, faded = false }) {
  if (!data) return null;
  const cls = `history-entry-line${faded ? " history-entry-line--faded" : ""}`;
  return (
    <span className={cls}>
      {data.categoryIcon ? `${data.categoryIcon} ` : ""}
      <strong>{data.title}</strong>
      {data.amount !== undefined && data.amount !== null && data.amount !== "" && (
        <> {"·"} {formatCurrency(data.amount, selectedCurrency, exchangeRates)}</>
      )}
      {data.entryDate && <> {"·"} {data.entryDate}</>}
      {data.note ? ` · 📝 ${data.note}` : ""}
    </span>
  );
}

function ActionBadge({ action, t }) {
  const label =
    action === "update" ? t.historyActionUpdate :
    action === "delete" ? t.historyActionDelete :
    action === "import" ? t.historyActionImport :
    action === "export" ? t.historyActionExport :
    t.historyActionAdd;
  const cls =
    action === "update" ? "history-badge history-badge--update" :
    action === "delete" ? "history-badge history-badge--delete" :
    action === "import" || action === "export" ? "history-badge history-badge--csv" :
    "history-badge history-badge--add";
  return <span className={cls}>{label}</span>;
}

export default function HistoryPage({ historyRows, selectedCurrency, exchangeRates, entryFilter, onDeleteHistory, onDeleteHistories, t }) {
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [deletingId, setDeletingId] = React.useState(null);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);
  const safeHistoryRows = Array.isArray(historyRows) ? historyRows : [];
  
  const visibleHistoryRows = safeHistoryRows.filter((row) => {
    const payload = parsePayload(row.payloadJson);
    const current = payload.after || payload.before || row;
    const entryDate = current.entryDate || row.entryDate || row.targetDate || "";
    if (fromDate && entryDate < fromDate) return false;
    if (toDate && entryDate > toDate) return false;
    return matchesEntryFilter({
      ...row,
      ...current,
      entryDate,
      categoryId: current.categoryId || row.categoryId,
      amount: current.amount ?? row.amount,
      title: current.title || row.title,
      note: current.note || row.note
    }, entryFilter);
  });

  try {
    return (
      <section className="lists-grid">
        <article className="card">
          <h2>{t.historyTitle}</h2>
          <p className="subtext">{t.historySubtext}</p>
          <div className="history-filters">
            <label>
              {t.fromDateLabel || "From"}
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label>
              {t.toDateLabel || "To"}
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
            {(fromDate || toDate) && (
              <button type="button" className="secondary-button" onClick={() => { setFromDate(""); setToDate(""); }}>
                {t.clearFiltersLabel || "Clear"}
              </button>
            )}
            {visibleHistoryRows.length > 0 && (
              <button
                type="button"
                className="inline-action danger-action"
                disabled={isDeletingAll || deletingId !== null}
                onClick={async () => {
                  if (isDeletingAll || deletingId !== null) return;
                  const confirmed = window.confirm(
                    t.historyDeleteAllConfirm || `このフィルター結果 ${visibleHistoryRows.length} 件を削除しますか？`
                  );
                  if (!confirmed) return;
                  setIsDeletingAll(true);
                  try {
                    await onDeleteHistories(visibleHistoryRows.map((row) => row.id));
                  } finally {
                    setIsDeletingAll(false);
                  }
                }}
              >
                {isDeletingAll ? "..." : (t.historyDeleteAllButton || "表示中の履歴を全削除")}
              </button>
            )}
          </div>
          {visibleHistoryRows.length === 0 ? (
            <p>{t.historyEmpty}</p>
          ) : (
            <table className="app-table history-table">

              <thead>
                <tr>
                  <th>{t.historyDateColumn || "Date"}</th>
                  <th>{t.historyItemColumn || "Item"}</th>
                  <th>{t.historyActionColumn || "Action"}</th>
                  <th>{t.historySourceColumn || "Source"}</th>
                  <th>{t.historyManageColumn || "Manage"}</th>
                </tr>
              </thead>

              <tbody>
                {visibleHistoryRows.map((row) => {
                  const payload = parsePayload(row.payloadJson);
                  const before = payload.before;
                  const after = payload.after;
                  const { date, time } = splitLoggedAt(row.loggedAt);

                  return (
                    <React.Fragment key={`history-${row.id}`}>
                      <tr>
                        <td>
                          <strong>{date}</strong>
                          <small className="history-time-cell">{time}</small>
                        </td>
                        <td className="history-item-cell">
                          {(row.action === "import" || row.action === "export") && (
                            <span className="history-csv-item">
                              <strong>{row.title}</strong>
                              {row.note && <small>{row.note}</small>}
                            </span>
                          )}
                          {row.action === "add" && (
                            <EntryLine
                              data={{ title: row.title, amount: row.amount, entryDate: row.targetDate, categoryIcon: row.categoryIcon, note: row.note }}
                              selectedCurrency={selectedCurrency}
                              exchangeRates={exchangeRates}
                            />
                          )}
                          {row.action === "update" && (
                            <>
                              <EntryLine data={before} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} faded />
                              <span className="history-arrow">→</span>
                              <EntryLine data={after} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} />
                            </>
                          )}
                          {row.action === "delete" && (
                            <>
                              <EntryLine data={before} selectedCurrency={selectedCurrency} exchangeRates={exchangeRates} faded />
                              <span className="history-arrow history-arrow--delete">→ {t.historyActionDelete}</span>
                            </>
                          )}
                          {row.action !== "add" && row.action !== "import" && row.action !== "export" && !before && (
                            <EntryLine
                              data={{ title: row.title, amount: row.amount, entryDate: row.targetDate, categoryIcon: row.categoryIcon, note: row.note }}
                              selectedCurrency={selectedCurrency}
                              exchangeRates={exchangeRates}
                            />
                          )}
                        </td>

                        <td><ActionBadge action={row.action} t={t} /></td>
                        <td>{row.action === "import" || row.action === "export" ? (t.historySourceCsv || "CSV") : row.source === "monthly" ? t.historySourceMonthly : t.historySourceDaily}</td>

                        <td className="history-table-actions">
                          <button
                            type="button"
                            className="inline-action danger-action"
                            disabled={deletingId === row.id || isDeletingAll}
                            onClick={async () => {
                              if (deletingId === row.id) return;
                              const confirmed = window.confirm(t.historyDeleteConfirm || "Delete this history log?");
                              if (!confirmed) return;
                              setDeletingId(row.id);
                              try {
                                await onDeleteHistory(row.id);
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                          >
                            {deletingId === row.id ? "..." : (t.historyDeleteButton || "Delete")}
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </article>
      </section>
    );
  } catch (err) {
    logError("HistoryPage.render", err);
    return (
      <section className="lists-grid">
        <article className="card">
          <h2>{t.historyTitle}</h2>
          <p className="error">{t?.errorUnexpectedMessage || "An unexpected error occurred while displaying"}</p>
        </article>
      </section>
    );
  }
}
