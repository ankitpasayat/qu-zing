import { useState } from 'react';
import { copyToClipboard } from '../lib/platform';
import { ComicLogo } from './ComicLogo';
import { ThemeToggle } from './ThemeToggle';
import { SoundToggle } from './SoundToggle';

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
      <div className="min-h-screen flex flex-col items-center justify-center p-4 safe-area-inset bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-100 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full">
          {/* Floating decorations */}
          <div className="absolute top-20 left-8 text-4xl animate-float opacity-50">🎮</div>
          <div className="absolute top-32 right-10 text-3xl animate-bounce-slow opacity-50">🧠</div>
          <div className="absolute bottom-40 left-12 text-3xl animate-wiggle opacity-50">⭐</div>
          <div className="absolute bottom-32 right-8 text-4xl animate-wobble opacity-50">🏆</div>
          
          {/* Header */}
          <div className="text-center mb-10 relative">
            <div className="relative inline-block">
              <ComicLogo size="lg" className="mb-3" />
              <div className="absolute -top-2 -right-6 text-2xl animate-wiggle">✨</div>
              <div className="absolute -bottom-1 -left-4 text-xl animate-wobble">🎯</div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Test what you know. Win with confidence! 🚀</p>
          </div>

          {/* Main Menu */}
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="comic-button w-full py-6 px-6 rounded-2xl text-xl transform transition-all group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                <span className="text-2xl group-hover:animate-wiggle">🎮</span>
                Create Lobby
              </span>
            </button>
            
            <button
              onClick={() => setMode('join')}
              className="w-full py-6 px-6 bg-white/90 dark:bg-[#231942]/80 hover:bg-purple-50 dark:hover:bg-[#2d1f4e]/80 border-4 border-purple-300 dark:border-purple-600/50 rounded-2xl font-black text-xl shadow-lg transform transition-all active:scale-95 hover:scale-[1.02] hover:-rotate-1 group"
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-2xl group-hover:animate-bounce">🚀</span>
                Join Lobby
              </span>
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-8 game-card p-5 border-4 border-amber-400 dark:border-purple-600/50 bg-amber-50/90 dark:bg-[#231942]/60 relative">
            <div className="absolute -top-3 -left-2 text-2xl animate-bounce-slow">💡</div>
            <h3 className="text-base font-black text-amber-700 dark:text-purple-300 mb-3 flex items-center gap-2">
              ⚡ How to Play
            </h3>
            <ul className="space-y-2 text-sm text-amber-800 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-base">🎯</span>
                <span>Answer trivia questions and bet tokens (1-10) based on confidence</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base">✅</span>
                <span>Correct = keep your points • Wrong = lose that token forever</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-base">🎟️</span>
                <span>Create a lobby to host or join with a 6-digit code</span>
              </li>
            </ul>
            <h4 className="font-black mt-4 mb-2 text-sm text-amber-700 dark:text-purple-300 flex items-center gap-2">
              🎮 Power-ups & Bonuses
            </h4>
            <ul className="space-y-1.5 text-sm text-amber-800 dark:text-gray-300">
              <li>🔥 <strong>Streak Fire:</strong> 2+ correct = bonus points</li>
              <li>⚡ <strong>Speed Demon:</strong> Answer fast = +2 points</li>
              <li>🎰 <strong>Endgame Gambit:</strong> High-stakes final rounds bet</li>
            </ul>
            <p className="mt-3 text-sm text-amber-700 dark:text-purple-400 font-black flex items-center gap-2">
              🏆 Highest score wins!
            </p>
          </div>

          {/* Discord Info */}
          <div className="mt-6 text-center game-card p-3 border-3 border-indigo-300 dark:border-indigo-700/50 bg-indigo-50/80 dark:bg-indigo-900/20">
            <p className="text-indigo-700 dark:text-indigo-300 text-sm font-medium flex items-center justify-center gap-2">
              <span className="text-lg">🎧</span>
              Playing on Discord? Launch from Voice Channel → Activities
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 safe-area-inset bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full">
          {/* Floating decorations */}
          <div className="absolute top-24 right-12 text-3xl animate-wiggle opacity-50">🎉</div>
          <div className="absolute bottom-36 left-8 text-2xl animate-bounce-slow opacity-50">🎮</div>
          
          {/* Back Button */}
          <button
            onClick={() => setMode('menu')}
            className="mb-6 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 transition-colors font-bold group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Header */}
          <div className="text-center mb-8 relative">
            <div className="absolute -top-2 left-1/4 text-2xl animate-wiggle">✨</div>
            <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 dark:from-purple-400 dark:via-pink-400 dark:to-orange-400 bg-clip-text text-transparent">
              Create Lobby
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Choose your username to get started! 🎮</p>
          </div>

          {/* Username Input */}
          <div className="space-y-5">
            <div className="game-card p-5 border-4 border-purple-300 dark:border-purple-600/50">
              <label className="block text-base font-black text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <span className="text-xl">👤</span> Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 20))}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && username.trim() && handleCreateLobby()}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full px-4 py-4 bg-white/90 dark:bg-[#231942]/70 border-3 border-purple-200 dark:border-purple-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-purple-400/50 focus:border-purple-400 font-bold text-lg transition-all"
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500 font-medium">{username.length}/20 characters</p>
            </div>

            <button
              onClick={handleCreateLobby}
              disabled={!username.trim() || isLoading}
              className="comic-button w-full py-5 px-6 rounded-2xl text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none group"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="group-hover:animate-wiggle">🎉</span>
                  Create Lobby
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 safe-area-inset bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-[#0c0618] dark:via-[#150d28] dark:to-[#1e1038] text-gray-900 dark:text-white transition-colors duration-300">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <SoundToggle />
          <ThemeToggle />
        </div>
        
        <div className="max-w-md w-full">
          {/* Floating decorations */}
          <div className="absolute top-24 left-10 text-3xl animate-bounce-slow opacity-50">🚀</div>
          <div className="absolute bottom-40 right-12 text-2xl animate-wiggle opacity-50">🎯</div>
          
          {/* Back Button */}
          <button
            onClick={() => setMode('menu')}
            className="mb-6 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 transition-colors font-bold group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Header */}
          <div className="text-center mb-8 relative">
            <div className="absolute -top-2 right-1/4 text-2xl animate-wobble">🎟️</div>
            <h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              Join Lobby
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Enter the lobby code to join! 🚀</p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div className="game-card p-5 border-4 border-blue-300 dark:border-blue-600/50">
              <label className="block text-base font-black text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <span className="text-xl">🎟️</span> Lobby Code
              </label>
              <input
                type="text"
                value={lobbyCode}
                onChange={(e) => setLobbyCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-4 bg-white/90 dark:bg-[#231942]/70 border-3 border-blue-200 dark:border-blue-700/50 rounded-xl text-gray-900 dark:text-white text-center text-3xl font-mono tracking-[0.3em] placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-3 focus:ring-blue-400/50 focus:border-blue-400 uppercase font-black transition-all"
                autoFocus
              />
            </div>

            <div className="game-card p-5 border-4 border-purple-300 dark:border-purple-600/50">
              <label className="block text-base font-black text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <span className="text-xl">👤</span> Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.slice(0, 20))}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && username.trim() && lobbyCode.length === 6 && handleJoinLobby()}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full px-4 py-4 bg-white/90 dark:bg-[#231942]/70 border-3 border-purple-200 dark:border-purple-700/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-purple-400/50 focus:border-purple-400 font-bold text-lg transition-all"
              />
              <p className="mt-2 text-sm text-gray-500 font-medium">{username.length}/20 characters</p>
            </div>

            {lobbyError && (
              <div className="p-4 game-card border-4 border-red-400 dark:border-red-500/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-bold flex items-center gap-3">
                <span className="text-xl">⚠️</span>
                {lobbyError}
              </div>
            )}

            <button
              onClick={handleJoinLobby}
              disabled={!username.trim() || lobbyCode.length !== 6 || isLoading}
              className="comic-button w-full py-5 px-6 rounded-2xl text-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none group"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="group-hover:animate-bounce">🚀</span>
                  Join Lobby
                </span>
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
        className="flex items-center gap-2 px-3 py-2 bg-purple-100/90 dark:bg-purple-900/50 hover:bg-purple-200/90 dark:hover:bg-purple-800/60 border-2 border-purple-300 dark:border-purple-600/60 rounded-xl transition-all group hover:scale-105 active:scale-95"
        title="Click to copy lobby code"
      >
        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">🎟️</span>
        <span className="font-mono font-black text-base text-purple-600 dark:text-purple-400 group-hover:text-purple-500 dark:group-hover:text-purple-300 tracking-wide">
          {lobbyCode}
        </span>
        {copied ? (
          <span className="text-sm text-green-600 dark:text-green-400 animate-pop-in">✓</span>
        ) : (
          <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <div className="mb-6 game-card p-5 border-4 border-purple-300 dark:border-purple-600/60 bg-gradient-to-r from-purple-50/90 to-indigo-50/90 dark:from-purple-900/30 dark:to-indigo-900/30 relative">
      <div className="absolute -top-2 -left-2 text-xl animate-wiggle">✨</div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-black text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <span className="text-lg">🎟️</span> Lobby Code
        </span>
        {onInvite && (
          <button
            onClick={onInvite}
            className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            <span>📤</span> Share
          </button>
        )}
      </div>
      
      <button
        onClick={handleCopy}
        className="w-full bg-white/90 dark:bg-[#1a1033]/80 hover:bg-purple-50 dark:hover:bg-[#231942]/80 rounded-xl px-4 py-4 border-3 border-purple-200 dark:border-purple-700/60 hover:border-purple-400 dark:hover:border-purple-500 transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
        title="Click to copy code"
      >
        <p className="text-4xl font-mono font-black text-center tracking-[0.2em] text-purple-600 dark:text-purple-400 group-hover:text-purple-500 dark:group-hover:text-purple-300 transition-colors">
          {lobbyCode}
        </p>
      </button>
      
      <p className="mt-3 text-sm text-center font-medium flex items-center justify-center gap-2">
        {copied ? (
          <span className="text-green-600 dark:text-green-400 animate-pop-in">✅ Code copied!</span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">👆 Click code to copy</span>
        )}
      </p>
    </div>
  );
}
