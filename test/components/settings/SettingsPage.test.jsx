import React from 'react';
import { render } from '@testing-library/react';
import SettingsPage from '../../../src/components/settings/SettingsPage.jsx';

const mockT = {};

describe('SettingsPage', () => {
  it('renders the page', () => {
    render(<SettingsPage t={mockT} />);
    expect(document.body).toBeInTheDocument();
  });
});
