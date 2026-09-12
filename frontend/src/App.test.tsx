import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the brand name', () => {
    render(<App />);
    expect(screen.getByText('Dream Makeover')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    render(<App />);
    expect(screen.getByText('A Luxury Beauty Salon')).toBeInTheDocument();
  });

  it('renders the placeholder heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /frontend foundation ready/i })).toBeInTheDocument();
  });
});
