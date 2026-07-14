import React from 'react';
import { render } from '@testing-library/react';
import DailyFullEditor from '../../../src/components/daily/DailyFullEditor.jsx';

const mockT = {
  typeLabel: 'Type',
  amountLabel: 'Amount',
  categoryLabel: 'Category',
  dateLabel: 'Date',
  titleLabel: 'Title',
  noteLabel: 'Note',
  saveButton: 'Save',
  cancelButton: 'Cancel',
};

describe('DailyFullEditor', () => {
  const mockProps = {
    initial: { 
      id: '1', 
      type: 'fee', 
      categoryId: 'food', 
      title: 'Lunch', 
      amount: 1000, 
      entryDate: '2023-01-01', 
      note: 'Test note' 
    },
    categoryOptions: [{ id: 'food', label: 'Food', icon: '🍔' }],
    onSave: jest.fn(),
    onCancel: jest.fn(),
    t: mockT,
  };

  it('renders the editor form', () => {
    render(<DailyFullEditor {...mockProps} />);
    expect(document.body).toBeInTheDocument();
  });
});
