import React from 'react';
import { render } from '@testing-library/react';
import CategoryManagerSection from '../../../src/components/category/CategoryManagerSection.jsx';

const mockT = {};

jest.mock('../../../src/lib/api', () => ({
  api: { categories: { getAll: jest.fn().mockResolvedValue([]) } },
}));

describe('CategoryManagerSection', () => {
  it('renders the section', async () => {
    render(<CategoryManagerSection t={mockT} />);
    expect(document.body).toBeInTheDocument();
  });
});
