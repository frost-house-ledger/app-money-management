import React from 'react';
import { render } from '@testing-library/react';

// Mock child components BEFORE importing DailyEntryPage
jest.mock('../../../src/components/daily/DailySection.jsx', () => ({
  __esModule: true,
  default: () => <div data-testid="daily-section">DailySection</div>,
  DailyListSection: () => <div data-testid="daily-list-section">DailyListSection</div>,
}));

jest.mock('../../../src/components/category/CategoryManagerSection.jsx', () => {
  return function CategoryManagerSection() {
    return <div data-testid="category-manager">CategoryManagerSection</div>;
  };
});

// Now import the component after mocks are set up
import DailyEntryPage from '../../../src/components/daily/DailyEntryPage.jsx';

const mockT = {};

describe('DailyEntryPage', () => {
  it('renders without error', () => {
    const props = {
      dailyForm: { type: 'fee', categoryId: '', title: '', amount: 0, entryDate: '', note: '' },
      setDailyForm: jest.fn(),
      onSubmitDaily: jest.fn(),
      editingDailyId: null,
      onEditDaily: jest.fn(),
      onCancelDailyEdit: jest.fn(),
      onDeleteDaily: jest.fn(),
      dailyCategoryOptions: [],
      categories: [],
      onCreateCategory: jest.fn(),
      onUpdateCategory: jest.fn(),
      onDeleteCategory: jest.fn(),
      onReorderCategories: jest.fn(),
      dailyRows: [],
      filteredRecurring: [],
      dailyTitle: '',
      dailyTitleSuggestions: [],
      onUpdateDailyInline: jest.fn(),
      selectedCurrency: 'JPY',
      exchangeRates: {},
      locale: 'en',
      selectedMonth: '2023-01',
      t: mockT,
    };

    render(<DailyEntryPage {...props} />);
    expect(document.body).toBeInTheDocument();
  });
});
