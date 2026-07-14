import React from 'react';
import { render } from '@testing-library/react';
import StatisticsSummaryPage from '../../../src/components/statistics/StatisticsSummaryPage.jsx';

const mockT = {};

jest.mock('../../../src/lib/api', () => ({
  api: { summary: { annualSummary: jest.fn().mockResolvedValue({}) } },
}));

describe('StatisticsSummaryPage', () => {
  it('renders the page', () => {
    render(
      <StatisticsSummaryPage
        selectedYear="2023"
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );
    expect(document.body).toBeInTheDocument();
  });
});
