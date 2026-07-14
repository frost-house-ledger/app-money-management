import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecurringListSection } from '../../../src/components/monthly/RecurringSection.jsx';

const mockT = {
  actionsLabel: "Actions",
  recurringStartMonthLabel: "Start Month",
  recurringEndMonthLabel: "End Month",
  typeLabel: "Type",
  frequencyLabel: "Frequency",
  categoryLabel: "Category",
  amountLabel: "Amount",
  titleLabel: "Title",
  noteLabel: "Note",
  frequencyAnnual: 'Annual',
  frequencyMonthly: 'Monthly',
};

describe('RecurringListSection', () => {
  it('renders the table with headers', () => {
    render(
      <RecurringListSection
        filteredRecurring={[]}
        recurringTitle="Test Title"
        dailyCategoryOptions={[]}
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders recurring data rows correctly', () => {
    const mockRecurringData = [
      {
        id: '1',
        startMonth: '2023-01',
        endMonth: '2023-12',
        type: 'fee',
        frequency: 'monthly',
        categoryId: 'food',
        categoryDisplay: 'Food',
        categoryIcon: '🍔',
        amount: 1000,
        title: 'Lunch Subscription',
        note: 'Monthly lunch plan',
      },
    ];

    render(
      <RecurringListSection
        filteredRecurring={mockRecurringData}
        recurringTitle="Test Title"
        dailyCategoryOptions={[]}
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );

    expect(screen.getByText('Lunch Subscription')).toBeInTheDocument();
  });
});
