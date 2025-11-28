import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from './test-utils';
import { Confetti, FloatingScore, Sparkles } from '../components/Confetti';

describe('Confetti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should render nothing when inactive', () => {
    const { container } = render(<Confetti active={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should not throw when activated', () => {
    expect(() => {
      render(<Confetti active={true} pieces={10} />);
    }).not.toThrow();
  });

  it('should not throw when transitioning from inactive to active', () => {
    const { rerender } = render(<Confetti active={false} pieces={10} />);
    
    expect(() => {
      rerender(<Confetti active={true} pieces={10} />);
    }).not.toThrow();
  });

  it('should not throw when transitioning from active to inactive', () => {
    const { rerender } = render(<Confetti active={true} pieces={10} />);
    
    expect(() => {
      rerender(<Confetti active={false} pieces={10} />);
    }).not.toThrow();
  });

  it('should accept different duration values', () => {
    expect(() => {
      render(<Confetti active={true} duration={1000} pieces={5} />);
    }).not.toThrow();

    expect(() => {
      render(<Confetti active={true} duration={5000} pieces={5} />);
    }).not.toThrow();
  });

  it('should accept different piece counts', () => {
    expect(() => {
      render(<Confetti active={true} pieces={1} />);
    }).not.toThrow();

    expect(() => {
      render(<Confetti active={true} pieces={100} />);
    }).not.toThrow();
  });

  it('should cleanup timer on unmount without errors', () => {
    const { unmount } = render(<Confetti active={true} pieces={10} duration={5000} />);
    
    // Unmount before duration completes - should not cause errors
    expect(() => unmount()).not.toThrow();
    
    // Advancing time after unmount should not cause errors
    expect(() => {
      vi.advanceTimersByTime(6000);
    }).not.toThrow();
  });

  it('should use default values when props not provided', () => {
    expect(() => {
      render(<Confetti active={true} />);
    }).not.toThrow();
  });
  
  it('should trigger RAF callback when transitioning to active state', async () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const { rerender } = render(<Confetti active={false} pieces={5} />);
    
    // Transition to active
    await act(async () => {
      rerender(<Confetti active={true} pieces={5} />);
    });
    
    // RAF should have been called
    expect(rafSpy).toHaveBeenCalled();
  });
  
  it('should trigger RAF callback when transitioning to inactive state', async () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const { rerender } = render(<Confetti active={true} pieces={5} />);
    
    // Clear the call from initial render
    rafSpy.mockClear();
    
    // Transition to inactive
    await act(async () => {
      rerender(<Confetti active={false} pieces={5} />);
    });
    
    // RAF should have been called for clearing
    expect(rafSpy).toHaveBeenCalled();
  });
  
  it('should setup duration timer when becoming active', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const { rerender } = render(<Confetti active={false} pieces={5} duration={2000} />);
    
    // Clear initial calls
    setTimeoutSpy.mockClear();
    
    // Transition to active
    await act(async () => {
      rerender(<Confetti active={true} pieces={5} duration={2000} />);
    });
    
    // Duration timer should be set
    expect(setTimeoutSpy).toHaveBeenCalled();
  });
});

describe('FloatingScore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render positive score with green color', () => {
    render(<FloatingScore score={10} />);
    const scoreElement = screen.getByText('+10');
    expect(scoreElement).toBeInTheDocument();
    expect(scoreElement).toHaveStyle({ color: '#4ade80' });
  });

  it('should render negative score with pink color', () => {
    render(<FloatingScore score={-5} />);
    const scoreElement = screen.getByText('-5');
    expect(scoreElement).toBeInTheDocument();
    expect(scoreElement).toHaveStyle({ color: '#fb7185' });
  });

  it('should render zero score without plus sign', () => {
    render(<FloatingScore score={0} />);
    const scoreElement = screen.getByText('0');
    expect(scoreElement).toBeInTheDocument();
  });

  it('should use custom position', () => {
    render(<FloatingScore score={10} x={25} y={75} />);
    const scoreElement = screen.getByText('+10');
    expect(scoreElement).toHaveStyle({ left: '25%', top: '75%' });
  });

  it('should use default position when not provided', () => {
    render(<FloatingScore score={10} />);
    const scoreElement = screen.getByText('+10');
    expect(scoreElement).toHaveStyle({ left: '50%', top: '50%' });
  });

  it('should disappear after 1 second', async () => {
    render(<FloatingScore score={10} />);
    
    expect(screen.getByText('+10')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.queryByText('+10')).not.toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    render(<FloatingScore score={10} />);
    const scoreElement = screen.getByText('+10');
    expect(scoreElement).toHaveClass('fixed', 'pointer-events-none', 'z-40', 'font-bold', 'text-2xl', 'animate-float-up');
  });
});

describe('Sparkles', () => {
  it('should render nothing when inactive', () => {
    const { container } = render(<Sparkles active={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render sparkles when active', () => {
    const { container } = render(<Sparkles active={true} />);
    const sparklesContainer = container.querySelector('.absolute.inset-0');
    expect(sparklesContainer).toBeInTheDocument();
  });

  it('should render exactly 6 sparkle elements', () => {
    render(<Sparkles active={true} />);
    const sparkles = screen.getAllByText('✨');
    expect(sparkles.length).toBe(6);
  });

  it('should have correct animation classes', () => {
    const { container } = render(<Sparkles active={true} />);
    const sparkleElements = container.querySelectorAll('.animate-sparkle');
    expect(sparkleElements.length).toBe(6);
  });

  it('should apply correct positioning to sparkles', () => {
    const { container } = render(<Sparkles active={true} />);
    const sparkles = container.querySelectorAll('.animate-sparkle');
    
    // First sparkle should be at x=20, y=35
    const firstSparkle = sparkles[0] as HTMLElement;
    expect(firstSparkle.style.left).toBe('20%');
    expect(firstSparkle.style.top).toBe('35%');
  });

  it('should apply animation delays to sparkles', () => {
    const { container } = render(<Sparkles active={true} />);
    const sparkles = container.querySelectorAll('.animate-sparkle');
    
    // Second sparkle should have delay of 0.2s
    const secondSparkle = sparkles[1] as HTMLElement;
    expect(secondSparkle.style.animationDelay).toBe('0.2s');
  });
});
