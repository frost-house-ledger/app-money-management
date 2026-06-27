import React from "react";
import { formatCurrency } from "../../lib/currency.js";
import { logError } from "../../lib/logger.js";

export default function SummaryCards({ monthlySummary, selectedCurrency, exchangeRates, selectedDailyCategory = "all", t }) {
  try {
    const safeMonthlySummary = monthlySummary || {};
    const showNumbers = selectedDailyCategory === "all";

    return (
      <section className="summary-grid">
        <article className="card stat income">
          <h2>{t.summaryIncome}</h2>
          <p>{showNumbers ? formatCurrency(safeMonthlySummary?.income ?? 0, selectedCurrency, exchangeRates) : "-"}</p>
        </article>
        <article className="card stat fee">
          <h2>{t.summaryFee}</h2>
          <p>{showNumbers ? formatCurrency(safeMonthlySummary?.fee ?? 0, selectedCurrency, exchangeRates) : "-"}</p>
        </article>
        <article className="card stat balance">
          <h2>{t.summaryBalance}</h2>
          <p>{showNumbers ? formatCurrency(safeMonthlySummary?.balance ?? 0, selectedCurrency, exchangeRates) : "-"}</p>
        </article>
      </section>
    );
  } catch (err) {
    logError("SummaryCards.render", err);
    return (
      <section className="summary-grid">
        <p className="error">{t?.errorUnexpectedMessage || "表示中にエラーが発生しました"}</p>
      </section>
    );
  }
}
