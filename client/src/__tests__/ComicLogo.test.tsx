import { describe, it, expect } from 'vitest';
import { render } from './test-utils';
import { ComicLogo } from '../components/ComicLogo';

describe('ComicLogo', () => {
  it('renders the logo with default large size', () => {
    const { container } = render(<ComicLogo />);
    
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('h-28');
  });

  it('renders with small size', () => {
    const { container } = render(<ComicLogo size="sm" />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-12');
  });

  it('renders with medium size', () => {
    const { container } = render(<ComicLogo size="md" />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-20');
  });

  it('renders with large size', () => {
    const { container } = render(<ComicLogo size="lg" />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('h-28');
  });

  it('applies custom className', () => {
    const { container } = render(<ComicLogo className="my-custom-class" />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('my-custom-class');
  });

  it('contains the Qu-Zing! text', () => {
    const { container } = render(<ComicLogo />);
    
    const textElement = container.querySelector('text');
    expect(textElement).toHaveTextContent('Qu-Zing!');
  });

  it('has proper SVG structure', () => {
    const { container } = render(<ComicLogo />);
    
    // Check for defs with gradients and filters
    const defs = container.querySelector('defs');
    expect(defs).toBeInTheDocument();
    
    const linearGradient = container.querySelector('#textGrad');
    expect(linearGradient).toBeInTheDocument();
    
    const filter = container.querySelector('#glow');
    expect(filter).toBeInTheDocument();
  });

  it('has correct viewBox', () => {
    const { container } = render(<ComicLogo />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 400 120');
  });

  it('renders lightning bolt decorations', () => {
    const { container } = render(<ComicLogo />);
    
    // There should be multiple path elements (burst + 2 lightning bolts)
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it('has inline-flex display class on wrapper', () => {
    const { container } = render(<ComicLogo />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('inline-flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });
});
