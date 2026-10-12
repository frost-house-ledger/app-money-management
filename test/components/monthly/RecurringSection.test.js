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
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('🍔 Food')).toBeInTheDocument();
  });

  it('shows annual frequency and the category for income rows', () => {
    render(
      <RecurringListSection
        filteredRecurring={[
          {
            id: 'annual-income',
            startMonth: '2023-01',
            type: 'income',
            frequency: 'annual',
            categoryId: 'salary',
            categoryDisplay: 'Salary',
            categoryIcon: '💼',
            amount: 12000,
            title: 'Annual bonus',
          },
        ]}
        recurringTitle="Test Title"
        dailyCategoryOptions={[]}
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );

    expect(screen.getByText('Annual')).toBeInTheDocument();
    expect(screen.getByText('💼 Salary')).toBeInTheDocument();
  });

  it('defaults missing recurring frequency to monthly', () => {
    render(
      <RecurringListSection
        filteredRecurring={[
          {
            id: 'legacy-row',
            startMonth: '2023-01',
            type: 'fee',
            categoryDisplay: 'Food',
            amount: 100,
            title: 'Legacy recurring item',
          },
        ]}
        recurringTitle="Test Title"
        dailyCategoryOptions={[]}
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );

    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });
});
