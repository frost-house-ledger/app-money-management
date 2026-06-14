import React from "react";
import { formatCurrency } from "../../lib/currency.js";

export default function SummaryCards({ monthlySummary, selectedCurrency, exchangeRates, selectedDailyCategory = "all", t }) {
  const showNumbers = selectedDailyCategory === "all";

  return (
    <section className="summary-grid">
      <article className="card stat income">
        <h2>{t.summaryIncome}</h2>
        <p>{showNumbers ? formatCurrency(monthlySummary?.income ?? 0, selectedCurrency, exchangeRates) : "-"}</p>
      </article>
      <article className="card stat fee">
        <h2>{t.summaryFee}</h2>
        <p>{showNumbers ? formatCurrency(monthlySummary?.fee ?? 0, selectedCurrency, exchangeRates) : "-"}</p>
      </article>
      <article className="card stat balance">
        <h2>{t.summaryBalance}</h2>
        <p>{showNumbers ? formatCurrency(monthlySummary?.balance ?? 0, selectedCurrency, exchangeRates) : "-"}</p>
      </article>
    </section>
  );
}
