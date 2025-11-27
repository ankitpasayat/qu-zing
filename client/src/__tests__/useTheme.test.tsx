import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../lib/useTheme';
import { ThemeProvider } from '../lib/theme';
import React from 'react';

describe('useTheme', () => {
  it('should return theme context when used within ThemeProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    expect(result.current).toHaveProperty('theme');
    expect(result.current).toHaveProperty('toggleTheme');
    expect(['light', 'dark']).toContain(result.current.theme);
  });

  it('should throw error when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useTheme());
    }).toThrow('useTheme must be used within a ThemeProvider');
    
    consoleSpy.mockRestore();
  });

  it('should toggle theme correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );
    
    const { result } = renderHook(() => useTheme(), { wrapper });
    
    const initialTheme = result.current.theme;
    
    act(() => {
      result.current.toggleTheme();
    });
    
    // Theme should toggle
    expect(result.current.theme).not.toBe(initialTheme);
  });
});
