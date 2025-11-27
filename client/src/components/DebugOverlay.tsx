import { useState, useEffect } from 'react';
import { logs, isDebugMode } from '../lib/debugLogger';

interface LogEntry {
  timestamp: number;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: unknown;
  stack?: string;
}

export function DebugOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>(logs);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const debugEnabled = isDebugMode();

  useEffect(() => {
    const handleLogUpdate = () => {
      setLogEntries([...logs]);
    };

    window.addEventListener('debug-log', handleLogUpdate);
    return () => window.removeEventListener('debug-log', handleLogUpdate);
  }, []);

  // Don't render anything if debug mode is disabled
  if (!debugEnabled) {
    return null;
  }

  const generateLogsText = () => {
    const logsText = logEntries.map(log => {
      const time = new Date(log.timestamp).toISOString();
      const level = log.level.toUpperCase().padEnd(5);
      let output = `[${time}] ${level} ${log.message}`;
      
      if (log.data !== undefined) {
        output += `\n  Data: ${typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}`;
      }
      
      if (log.stack) {
        output += `\n  Stack Trace:\n${log.stack.split('\n').map(line => `    ${line}`).join('\n')}`;
      }
      
      return output;
    }).join('\n\n---\n\n');

    return `Debug Logs Export\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `Total Logs: ${logEntries.length}\n` +
      `Errors: ${logEntries.filter(l => l.level === 'error').length}\n` +
      `Warnings: ${logEntries.filter(l => l.level === 'warn').length}\n` +
      `\n${'='.repeat(80)}\n\n` +
      logsText;
  };

  const copyLogsToClipboard = async () => {
    const fullReport = generateLogsText();

    try {
      // Try using the Clipboard API first
      await navigator.clipboard.writeText(fullReport);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for environments where Clipboard API is blocked (e.g., Discord iframe)
      console.error('Failed to copy logs:', err);
      
      // Create a temporary textarea for fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = fullReport;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        } else {
          // If copy fails, trigger download instead
          downloadLogs();
        }
      } catch (fallbackErr) {
        console.error('Fallback copy also failed:', fallbackErr);
        // If all copy methods fail, trigger download
        downloadLogs();
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  const downloadLogs = () => {
    const fullReport = generateLogsText();
    const blob = new Blob([fullReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 md:right-16 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 md:px-4 rounded-lg text-xs md:text-sm font-mono shadow-lg z-50 border border-gray-600 whitespace-nowrap transition-colors"
      >
        🐛 Debug ({logEntries.length})
      </button>
    );
  }

  const errorCount = logEntries.filter(l => l.level === 'error').length;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2 md:mb-0">
            <div className="flex items-center gap-2 md:gap-4">
              <h2 className="text-base md:text-lg font-bold text-white">Debug Console</h2>
              <div className="flex gap-1 md:gap-2 text-xs md:text-sm">
                <span className="text-gray-400">{logEntries.length}</span>
                {errorCount > 0 && <span className="text-red-400">{errorCount}⚠️</span>}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="px-2 py-1 md:px-3 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs md:text-sm transition-colors"
            >
              Close
            </button>
          </div>
          <div className="flex gap-1 md:gap-2 mt-2">
            <button
              onClick={copyLogsToClipboard}
              className={`flex-1 px-2 py-1 md:px-3 ${copySuccess ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} text-white rounded text-xs md:text-sm transition-colors`}
            >
              {copySuccess ? '✓' : '📋 Copy'}
            </button>
            <button
              onClick={downloadLogs}
              className="flex-1 px-2 py-1 md:px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs md:text-sm transition-colors"
            >
              💾 Save
            </button>
            <button
              onClick={() => {
                logs.length = 0;
                setLogEntries([]);
                setSelectedLog(null);
              }}
              className="px-2 py-1 md:px-3 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs md:text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Log list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
            {logEntries.slice().reverse().map((log, idx) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              const bgColor = log.level === 'error' 
                ? 'bg-red-900/30 border-red-800' 
                : log.level === 'warn'
                ? 'bg-yellow-900/30 border-yellow-800'
                : 'bg-gray-800 border-gray-700';
              
              const textColor = log.level === 'error'
                ? 'text-red-300'
                : log.level === 'warn'
                ? 'text-yellow-300'
                : 'text-gray-300';

              return (
                <div
                  key={logEntries.length - idx}
                  onClick={() => setSelectedLog(log)}
                  className={`p-2 rounded border ${bgColor} ${textColor} cursor-pointer hover:brightness-110 transition-all`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 flex-shrink-0">{time}</span>
                    <span className="flex-shrink-0 font-bold">
                      {log.level === 'error' ? '❌' : log.level === 'warn' ? '⚠️' : 'ℹ️'}
                    </span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                </div>
              );
            })}
            {logEntries.length === 0 && (
              <div className="text-gray-500 text-center py-8">No logs yet</div>
            )}
          </div>

          {/* Detail panel */}
          {selectedLog && (
            <div className="w-1/3 border-l border-gray-700 p-4 overflow-y-auto bg-gray-900">
              <div className="mb-4">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  ← Back
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-gray-500 text-xs mb-1">Time</div>
                  <div className="text-white text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Level</div>
                  <div className="text-white text-sm">{selectedLog.level.toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Message</div>
                  <div className="text-white text-sm break-all">{selectedLog.message}</div>
                </div>
                {selectedLog.data !== undefined && (
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Data</div>
                    <pre className="text-gray-200 text-xs bg-gray-800 p-2 rounded overflow-x-auto border border-gray-700">
                      {typeof selectedLog.data === 'string' 
                        ? selectedLog.data 
                        : JSON.stringify(selectedLog.data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.stack && (
                  <div>
                    <div className="text-gray-500 text-xs mb-1">Stack Trace</div>
                    <pre className="text-gray-200 text-xs bg-gray-800 p-2 rounded overflow-x-auto border border-gray-700">
                      {selectedLog.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
