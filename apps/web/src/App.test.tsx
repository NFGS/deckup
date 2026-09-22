import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders the product name', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'DeckUp' })).toBeInTheDocument();
  });

  it('renders the three core feature cards', () => {
    render(<App />);

    expect(screen.getByText('Custom decks')).toBeInTheDocument();
    expect(screen.getByText('Smart scheduling')).toBeInTheDocument();
    expect(screen.getByText('Study analytics')).toBeInTheDocument();
  });
});
