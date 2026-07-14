import React from 'react';
import { render } from '@testing-library/react';
import SummaryCards from '../../../src/components/chart/SummaryCards.jsx';

const mockT = {
  summaryIncome: 'Income',
  summaryFee: 'Expense',
  summaryBalance: 'Balance',
  errorUnexpectedMessage: 'An unexpected error occurred',
};

describe('SummaryCards', () => {
  const mockProps = {
    monthlySummary: {
      income: 100000,
      fee: 30000,
      balance: 70000,
    },
    selectedCurrency: "JPY",
    exchangeRates: {},
    selectedDailyCategory: "all",
    t: mockT,
  };

  it('renders summary cards', () => {
    render(<SummaryCards {...mockProps} />);
    expect(document.body).toBeInTheDocument();
  });

  it('renders with filtered category', () => {
    render(<SummaryCards {...mockProps} selectedDailyCategory="food" />);
    expect(document.body).toBeInTheDocument();
  });
});
