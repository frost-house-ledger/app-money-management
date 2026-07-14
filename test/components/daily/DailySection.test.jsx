import React from 'react';
import { render, screen } from '@testing-library/react';
import DailySection from '../../../src/components/daily/DailySection.jsx';

const mockT = {
  typeLabel: 'Type',
  amountLabel: 'Amount',
  categoryLabel: 'Category',
  dateLabel: 'Date',
  titleLabel: 'Title',
  noteLabel: 'Note',
  saveButton: 'Save',
  cancelButton: 'Cancel',
  dailyTitlePlaceholder: 'Title',
  dailyAmountPlaceholder: 'Amount',
  dailyNotePlaceholder: 'Note',
  saveDailyButton: 'Save Entry',
  errorUnexpectedMessage: 'An unexpected error occurred',
  typeFee: 'Expense',
  typeIncome: 'Income',
};

describe('DailySection', () => {
  const mockProps = {
    dailyForm: { type: 'fee', categoryId: 'food', title: '', amount: 0, entryDate: '2023-01-01', note: '' },
    setDailyForm: jest.fn(),
    onSubmit: jest.fn(),
    currentYYYYMM: '2023-01',
    editingDailyId: null,
    onCancelEdit: jest.fn(),
    dailyCategoryOptions: [{ id: 'food', label: 'Food', icon: '🍔' }],
    t: mockT,
  };

  it('renders the form', () => {
    render(<DailySection {...mockProps} />);
    expect(document.body).toBeInTheDocument();
  });
});
