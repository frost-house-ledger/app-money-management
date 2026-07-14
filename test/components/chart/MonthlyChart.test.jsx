import React from 'react';
import { render } from '@testing-library/react';
import MonthlyChart from '../../../src/components/chart/MonthlyChart.jsx';

jest.mock('react-chartjs-2', () => ({
  Chart: () => <div data-testid="chart">Chart</div>,
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  BarController: {},
  LineElement: {},
  LineController: {},
  PointElement: {},
  Tooltip: {},
  Legend: {},
  Filler: {},
}));

describe('MonthlyChart', () => {
  it('renders without error', () => {
    const mockRows = [
      { month: '2023-01', income: 100000, fee: 30000, balance: 70000 },
    ];

    render(
      <MonthlyChart
        rows={mockRows}
        currencyCode="JPY"
        exchangeRates={{}}
        selectedDailyCategory="all"
      />
    );
    
    expect(document.body).toBeInTheDocument();
  });
});
