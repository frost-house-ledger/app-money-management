import React from 'react';
import { render } from '@testing-library/react';
import AnnualSummaryPage from '../../../src/components/annual/AnnualSummaryPage.jsx';

const mockT = {};

jest.mock('../../../src/lib/api', () => ({
  api: { summary: { annualSummary: jest.fn().mockResolvedValue({}) } },
}));

describe('AnnualSummaryPage', () => {
  it('renders the page', () => {
    render(
      <AnnualSummaryPage
        selectedYear="2023"
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );
    expect(document.body).toBeInTheDocument();
  });
});
