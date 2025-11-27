import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeAll } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Setup before all tests
beforeAll(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(window, 'localStorage', { 
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  // Mock navigator.clipboard (configurable to allow userEvent to work)
  const clipboardMock = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  };
  Object.defineProperty(navigator, 'clipboard', {
    value: clipboardMock,
    writable: true,
    configurable: true,
  });

  // Mock navigator.share
  Object.defineProperty(navigator, 'share', {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  });
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
