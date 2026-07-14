import React from 'react';
import { render } from '@testing-library/react';
import ChartDashboardPage from '../../../src/components/chart/ChartDashboardPage.jsx';

const mockT = {};

jest.mock('../../../src/lib/api', () => ({
  api: { summary: { monthly: jest.fn().mockResolvedValue({}) } },
}));

describe('ChartDashboardPage', () => {
  it('renders the page', () => {
    render(
      <ChartDashboardPage
        selectedMonth="2023-01"
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );
    expect(document.body).toBeInTheDocument();
  });
});
