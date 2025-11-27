import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './lib/theme.tsx'

// Helper to show error UI
function showErrorUI(title: string, message: string, details?: string) {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(145deg, #0f0a1e 0%, #1a1033 40%, #231942 100%); color: white; padding: 20px; text-align: center;">
        <div style="max-width: 500px;">
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <h1 style="color: #ef4444; margin-bottom: 16px; font-size: 24px;">${title}</h1>
          <p style="color: #94a3b8; margin-bottom: 8px;">${message}</p>
          ${details ? `<p style="color: #64748b; font-size: 12px; margin-bottom: 16px;">${details}</p>` : ''}
          <button onclick="window.location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
            Reload
          </button>
        </div>
      </div>
    `;
  }
}

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('🔴 Uncaught error:', { message, source, lineno, colno, error });
  showErrorUI('Application Error', String(message), `${source}:${lineno}:${colno}`);
};

// Handle unhandled promise rejections
window.onunhandledrejection = (event) => {
  console.error('🔴 Unhandled promise rejection:', event.reason);
  // Show error for unhandled promise rejections (common in Discord SDK issues)
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
  if (message.includes('Discord') || message.includes('SDK') || message.includes('Activity')) {
    showErrorUI(
      'Discord Connection Error',
      message,
      'Make sure you launched this from Discord Activities'
    );
  }
};

// Add a timeout to detect if the app is stuck loading
const loadTimeout = setTimeout(() => {
  const root = document.getElementById('root');
  const loader = document.getElementById('initial-loader');
  // If the initial loader is still showing after 30 seconds, something is wrong
  if (root && loader && root.contains(loader)) {
    console.error('🔴 App failed to load within timeout');
    showErrorUI(
      'Loading Timeout',
      'The app is taking too long to load. This might be a connection issue.',
      'Try refreshing or check your internet connection'
    );
  }
}, 30000);

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
  // Clear the timeout since we successfully started rendering
  clearTimeout(loadTimeout);
} catch (error) {
  console.error('🔴 Failed to render app:', error);
  clearTimeout(loadTimeout);
  showErrorUI(
    'Failed to start application',
    error instanceof Error ? error.message : 'Unknown error'
  );
}
