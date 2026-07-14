import React from 'react';
import { render } from '@testing-library/react';
import SavingsSimulationPanel from '../../../src/components/statistics/SavingsSimulationPanel.jsx';

const mockT = {};

describe('SavingsSimulationPanel', () => {
  it('renders the panel', () => {
    render(<SavingsSimulationPanel t={mockT} />);
    expect(document.body).toBeInTheDocument();
  });
});
