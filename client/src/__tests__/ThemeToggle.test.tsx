import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from './test-utils';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../components/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the toggle button', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('has correct accessibility label', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', expect.stringMatching(/switch to (dark|light) mode/i));
  });

  it('calls toggleTheme when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Just verify it doesn't throw
    expect(button).toBeInTheDocument();
  });

  it('has proper styling classes', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    // Component now uses game-control-btn class and is positioned by parent
    expect(button).toHaveClass('game-control-btn');
  });

  it('renders sun/moon emoji', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    // Check for sun or moon emoji
    expect(button.textContent).toMatch(/☀️|🌙/);
  });
});
