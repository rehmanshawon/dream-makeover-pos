import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the sidebar', () => {
    render(<App />);
    expect(screen.getByRole('complementary', { name: /primary navigation/i })).toBeInTheDocument();
  });

  it('renders the topbar with the dashboard title', () => {
    render(<App />);
    // jsdom defaults to '/' so the dashboard is the active route
    expect(screen.getByRole('heading', { name: /^dashboard$/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the dashboard placeholder', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /^dashboard$/i, level: 2 })).toBeInTheDocument();
  });
});
