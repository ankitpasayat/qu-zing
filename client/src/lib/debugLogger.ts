interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: unknown;
  stack?: string;
}

export const logs: LogEntry[] = [];
const MAX_LOGS = 50;

const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

// Check if debug mode is enabled via URL parameter or localStorage
function checkDebugMode(): boolean {
  // Check URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('debug') === 'true') {
    // Persist debug mode to localStorage when enabled via URL
    try {
      localStorage.setItem('quzing_debug', 'true');
    } catch {
      // Ignore localStorage errors
    }
    return true;
  }
  if (urlParams.get('debug') === 'false') {
    // Clear debug mode from localStorage when explicitly disabled
    try {
      localStorage.removeItem('quzing_debug');
    } catch {
      // Ignore localStorage errors
    }
    return false;
  }
  // Check localStorage for persisted debug mode
  try {
    return localStorage.getItem('quzing_debug') === 'true';
  } catch {
    return false;
  }
}

let debugMode = checkDebugMode();

export function isDebugMode(): boolean {
  return debugMode;
}

export function setDebugMode(enabled: boolean): void {
  debugMode = enabled;
  try {
    if (enabled) {
      localStorage.setItem('quzing_debug', 'true');
    } else {
      localStorage.removeItem('quzing_debug');
    }
  } catch {
    // Ignore localStorage errors
  }
}

function addLog(level: 'info' | 'error' | 'warn', message: string, data?: unknown, stack?: string) {
  logs.push({ timestamp: Date.now(), level, message, data, stack });
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }
  window.dispatchEvent(new CustomEvent('debug-log'));
}

export function initDebugLogger() {
  console.log = (...args: unknown[]) => {
    // Only output to console if debug mode is enabled
    if (debugMode) {
      originalConsole.log(...args);
    }
    // Always capture logs internally for the debug overlay
    addLog('info', args.map(a => String(a)).join(' '), args.length > 1 ? JSON.stringify(args) : undefined);
  };

  console.error = (...args: unknown[]) => {
    // Only output to console if debug mode is enabled
    if (debugMode) {
      originalConsole.error(...args);
    }
    // Always capture logs internally for the debug overlay
    const stack = args.find(a => a instanceof Error)?.stack || new Error().stack;
    addLog('error', args.map(a => String(a)).join(' '), args.length > 1 ? JSON.stringify(args) : undefined, stack);
  };

  console.warn = (...args: unknown[]) => {
    // Only output to console if debug mode is enabled
    if (debugMode) {
      originalConsole.warn(...args);
    }
    // Always capture logs internally for the debug overlay
    addLog('warn', args.map(a => String(a)).join(' '), args.length > 1 ? JSON.stringify(args) : undefined);
  };
}
