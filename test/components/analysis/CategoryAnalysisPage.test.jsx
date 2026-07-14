import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CategoryAnalysisPage from '../../../src/components/analysis/CategoryAnalysisPage.jsx';

// Mock the api module
jest.mock('../../../src/lib/api', () => ({
  api: {
    summary: {
      categoryBreakdown: jest.fn(),
      categoryTrend: jest.fn(),
    },
    targets: {
      get: jest.fn(),
      save: jest.fn(),
    },
  },
}));

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="pie-chart">Pie Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

// Mock chart.js
jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
  ArcElement: {},
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  LineElement: {},
  PointElement: {},
  Tooltip: {},
  Legend: {},
}));

const { api } = require('../../../src/lib/api');
const mockT = (key) => key;

describe('CategoryAnalysisPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.summary.categoryBreakdown.mockResolvedValue([]);
    api.summary.categoryTrend.mockResolvedValue([]);
    api.targets.get.mockResolvedValue([]);
  });

  it('renders the page', async () => {
    render(
      <CategoryAnalysisPage
        selectedMonth="2023-01"
        range={{ fromMonth: '2023-01', toMonth: '2023-01' }}
        selectedCurrency="JPY"
        exchangeRates={{}}
        locale="en"
        t={mockT}
      />
    );

    // Component should render without error
    expect(document.body).toBeInTheDocument();
  });

  it('fetches and displays category breakdown data', async () => {
    const breakdownData = [
      { categoryDisplay: 'Food', categoryIcon: '🍔', total: 100, categoryId: 'food' },
    ];
    api.summary.categoryBreakdown.mockResolvedValue(breakdownData);

    render(
      <CategoryAnalysisPage
        selectedMonth="2023-01"
        range={{ fromMonth: '2023-01', toMonth: '2023-01' }}
        selectedCurrency="JPY"
        exchangeRates={{}}
        locale="en"
        t={mockT}
      />
    );

    await waitFor(() => {
      expect(api.summary.categoryBreakdown).toHaveBeenCalled();
    });
  });

  it('renders charts', async () => {
    render(
      <CategoryAnalysisPage
        selectedMonth="2023-01"
        range={{ fromMonth: '2023-01', toMonth: '2023-01' }}
        selectedCurrency="JPY"
        exchangeRates={{}}
        locale="en"
        t={mockT}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });
});
