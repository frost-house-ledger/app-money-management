import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StatisticsSummaryPage from '../../../src/components/statistics/StatisticsSummaryPage.jsx';

const mockRange = jest.fn();
const mockT = {
  actionRetry: 'Retry', errorLoadFailed: 'Failed to load statistics.', loadingLabel: 'Loading...',
  monthLabel: 'Month', summaryIncome: 'Income', summaryFee: 'Expense', summaryBalance: 'Balance',
  monthComparisonLabel: 'Change', cumulativeLabel: 'Cumulative', saveLabel: 'Save balance',
  savingsSimButtonLabel: 'Simulation'
};

jest.mock('../../../src/lib/api', () => ({
  api: { summary: { range: (...args) => mockRange(...args) } },
}));

describe('StatisticsSummaryPage', () => {
  it('renders the page', () => {
    render(
      <StatisticsSummaryPage
            selectedMonth="2023-04"
        selectedCurrency="JPY"
        exchangeRates={{}}
        t={mockT}
      />
    );
    expect(document.body).toBeInTheDocument();
    });

  beforeEach(() => { mockRange.mockReset(); localStorage.clear(); });

  it('loads the selected year', async () => {
    mockRange.mockResolvedValue([{ month: '2023-04', income: 100, fee: 25, balance: 75 }]);
    render(<StatisticsSummaryPage selectedMonth="2023-04" selectedCurrency="JPY" exchangeRates={{}} t={mockT} />);
    await waitFor(() => expect(mockRange).toHaveBeenCalledWith({ fromMonth: '2023-01', toMonth: '2023-12' }));
  });

  it('shows an error and retries after a failed request', async () => {
    mockRange.mockRejectedValueOnce(new Error('network failure')).mockResolvedValueOnce([]);
    render(<StatisticsSummaryPage selectedMonth="2023-04" selectedCurrency="JPY" exchangeRates={{}} t={mockT} />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(mockRange).toHaveBeenCalledTimes(2));
  });

  it('updates saved balance formatting when currency changes', async () => {
    localStorage.setItem('analysis:currentBalance', '1000');
    mockRange.mockResolvedValue([]);
    const { rerender } = render(<StatisticsSummaryPage selectedMonth="2023-04" selectedCurrency="JPY" exchangeRates={{}} t={mockT} />);
    const savedValue = await screen.findByText(/Saved value:/);
    const jpyText = savedValue.textContent;
    rerender(<StatisticsSummaryPage selectedMonth="2023-04" selectedCurrency="USD" exchangeRates={{ USD: 0.01 }} t={mockT} />);
    await waitFor(() => expect(screen.getByText(/Saved value:/).textContent).not.toBe(jpyText));
  });
});
