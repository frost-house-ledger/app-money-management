import React from 'react';
import { render } from '@testing-library/react';
import HistoryPage from '../../../src/components/history/HistoryPage.jsx';

const mockT = {};

jest.mock('../../../src/lib/api', () => ({
  api: { history: { getAll: jest.fn().mockResolvedValue([]) } },
}));

describe('HistoryPage', () => {
  it('renders the page', () => {
    render(
      <HistoryPage
        selectedMonth="2023-01"
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );
    expect(document.body).toBeInTheDocument();
  });
});
