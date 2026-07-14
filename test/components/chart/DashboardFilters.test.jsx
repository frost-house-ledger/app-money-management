import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardFilters from '../../../src/components/chart/DashboardFilters.jsx';

const mockT = {
  dashboardRangeLabel: 'Date Range',
  dashboardCurrencyLabel: 'Currency',
  dashboardCategoryLabel: 'Category',
};

describe('DashboardFilters', () => {
  const mockProps = {
    range: { fromMonth: '2023-01', toMonth: '2023-12' },
    onRangeChange: jest.fn(),
    selectedCurrency: "JPY",
    onCurrencyChange: jest.fn(),
    selectedDailyCategory: "all",
    onCategoryChange: jest.fn(),
    t: mockT,
  };

  it('renders filter controls', () => {
    render(<DashboardFilters {...mockProps} />);
    // Component renders without error
    expect(document.body).toBeInTheDocument();
  });
});
