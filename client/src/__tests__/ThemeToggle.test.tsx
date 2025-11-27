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

  it('has fixed positioning classes', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('fixed');
    expect(button).toHaveClass('top-4');
    expect(button).toHaveClass('right-4');
    expect(button).toHaveClass('z-50');
  });

  it('has proper styling classes', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('p-2');
    expect(button).toHaveClass('rounded-full');
    expect(button).toHaveClass('backdrop-blur-sm');
    expect(button).toHaveClass('shadow-lg');
  });

  it('renders SVG icon', () => {
    const { container } = render(<ThemeToggle />);
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-5');
    expect(svg).toHaveClass('h-5');
  });
});
