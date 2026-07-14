import React from 'react';
import { render, screen } from '@testing-library/react';
import MonthlyEntryPage from '../../../src/components/monthly/MonthlyEntryPage.jsx';

// Mock the child components
jest.mock('../../../src/components/monthly/RecurringSection.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="recurring-section">RecurringSection</div>,
  RecurringListSection: () => <div data-testid="recurring-list-section">RecurringListSection</div>,
}));

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

const mockT = {
  monthlyEntryTitle: 'Monthly Entry',
  recurringListTitle: 'Recurring Items',
};

describe('MonthlyEntryPage', () => {
  const defaultProps = {
    currentMonth: '2023-01',
    monthlyAmount: 0,
    monthlyRows: [],
    monthlyTitle: 'Monthly',
    filteredRecurring: [],
    filteredRecurringTitle: 'Active Recurring',
    selectedCurrency: 'JPY',
    exchangeRates: {},
    t: mockT,
  };

  it('renders the main page', () => {
    render(<MonthlyEntryPage {...defaultProps} />);
    expect(document.body).toBeInTheDocument();
  });
});
