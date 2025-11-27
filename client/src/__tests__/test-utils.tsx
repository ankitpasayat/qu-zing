import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '../lib/theme';

// Custom render that wraps components in necessary providers
interface WrapperProps {
  children: React.ReactNode;
}

function AllTheProviders({ children }: WrapperProps) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
