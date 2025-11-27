import { useState } from 'react';
import { copyToClipboard } from '../lib/platform';
import { ComicLogo } from './ComicLogo';
import { ThemeToggle } from './ThemeToggle';

interface BrowserLobbyProps {
  onCreateLobby: (username: string) => void;
  onJoinLobby: (lobbyCode: string, username: string) => void;
}

export function BrowserLobby({ onCreateLobby, onJoinLobby }: BrowserLobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  // Pre-fill username from localStorage if available
  const [username, setUsername] = useState(() => {
    try {
      const stored = localStorage.getItem('trivia_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.username || '';
      }
    } catch { /* ignore */ }
    return '';
  });
  const [lobbyCode, setLobbyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const handleCreateLobby = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    try {
      await onCreateLobby(username.trim());
    } catch (error) {
      console.error('Failed to create lobby:', error);
      setIsLoading(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!username.trim() || !lobbyCode.trim()) return;
    
    // Validate lobby code format
    const code = lobbyCode.trim().toUpperCase();
    if (code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)) {
      setLobbyError('Lobby code must be exactly 6 characters (letters and numbers)');
      return;
    }
    
    setLobbyError(null);
    setIsLoading(true);
    try {
      await onJoinLobby(code, username.trim());
    } catch (error) {
      console.error('Failed to join lobby:', error);
      setLobbyError(error instanceof Error ? error.message : 'Failed to join lobby');
      setIsLoading(false);
    }
  };

  if (mode === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
        <ThemeToggle />
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <ComicLogo size="lg" className="mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Test what you know. Win with confidence.</p>
          </div>

          {/* Main Menu */}
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="comic-button w-full py-6 px-6 rounded-xl text-lg transform transition-all"
            >
              🎮 Create Lobby
            </button>
            
            <button
              onClick={() => setMode('join')}
              className="w-full py-6 px-6 bg-white/80 dark:bg-[#231942]/70 hover:bg-purple-50 dark:hover:bg-[#2d1f4e]/70 border-2 border-purple-200/50 dark:border-purple-700/40 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-95"
            >
              🚀 Join Lobby
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-amber-100 dark:bg-[#231942]/50 border-2 border-amber-400 dark:border-purple-700/30 rounded-xl">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-purple-300 mb-2">⚡ How to Play</h3>
            <ul className="space-y-1 text-xs text-amber-800 dark:text-gray-400">
              <li>• Answer trivia questions and bet tokens on your confidence</li>
              <li>• Correct answers keep your tokens • Wrong answers lose them forever</li>
              <li>• Create a lobby to host or join with a 6-digit code</li>
              <li>• Highest score wins!</li>
            </ul>
          </div>

          {/* Discord Info */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              Playing on Discord? Launch from Voice Channel → Activities
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
        <ThemeToggle />
        <div className="max-w-md w-full">
          {/* Back Button */}
          <button
            onClick={() => setMode('menu')}
            className="mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Create Lobby</h2>
            <p className="text-gray-600 dark:text-gray-400">Choose your username to get started</p>
          </div>

          {/* Username Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 20))}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && username.trim() && handleCreateLobby()}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full px-4 py-3 bg-white/80 dark:bg-[#231942]/60 border-2 border-purple-200/50 dark:border-purple-700/40 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">{username.length}/20 characters</p>
            </div>

            <button
              onClick={handleCreateLobby}
              disabled={!username.trim() || isLoading}
              className="comic-button w-full py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Lobby'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-[#0f0a1e] dark:via-[#1a1033] dark:to-[#231942] text-gray-900 dark:text-white transition-colors duration-300">
        <ThemeToggle />
        <div className="max-w-md w-full">
          {/* Back Button */}
          <button
            onClick={() => setMode('menu')}
            className="mb-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Join Lobby</h2>
            <p className="text-gray-600 dark:text-gray-400">Enter the lobby code to join</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lobby Code
              </label>
              <input
                type="text"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-3 bg-white/80 dark:bg-[#231942]/60 border-2 border-purple-200/50 dark:border-purple-700/40 rounded-xl text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 uppercase"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 20))}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && username.trim() && lobbyCode.length === 6 && handleJoinLobby()}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full px-4 py-3 bg-white/80 dark:bg-[#231942]/60 border-2 border-purple-200/50 dark:border-purple-700/40 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">{username.length}/20 characters</p>
            </div>

            {lobbyError && (
              <div className="p-3 bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/40 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {lobbyError}
              </div>
            )}

            <button
              onClick={handleJoinLobby}
              disabled={!username.trim() || lobbyCode.length !== 6 || isLoading}
              className="comic-button w-full py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                '🚀 Join Lobby'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

interface LobbyCodeDisplayProps {
  lobbyCode: string;
  onInvite?: () => void;
  compact?: boolean;
}

export function LobbyCodeDisplay({ lobbyCode, onInvite, compact = false }: LobbyCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(lobbyCode);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Compact version for gameplay screens
  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100/80 dark:bg-purple-900/40 hover:bg-purple-200/80 dark:hover:bg-purple-800/50 border border-purple-300 dark:border-purple-700/50 rounded-lg transition-colors group"
        title="Click to copy lobby code"
      >
        <span className="text-xs text-gray-600 dark:text-gray-400">Code:</span>
        <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400 group-hover:text-purple-500 dark:group-hover:text-purple-300">
          {lobbyCode}
        </span>
        {copied && <span className="text-xs text-green-600 dark:text-green-400">✓</span>}
      </button>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-100/50 to-indigo-100/50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-300 dark:border-purple-700/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Lobby Code</span>
        {onInvite && (
          <button
            onClick={onInvite}
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors"
          >
            Share
          </button>
        )}
      </div>
      
      <button
        onClick={handleCopy}
        className="w-full bg-white/70 dark:bg-[#1a1033]/70 hover:bg-white dark:hover:bg-[#231942]/70 rounded-lg px-4 py-3 border border-purple-200 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 transition-all cursor-pointer group"
        title="Click to copy code"
      >
        <p className="text-3xl font-mono font-bold text-center tracking-widest text-purple-600 dark:text-purple-400 group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors">
          {lobbyCode}
        </p>
      </button>
      
      <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
        {copied ? '✓ Code copied!' : 'Click code to copy'}
      </p>
    </div>
  );
}
