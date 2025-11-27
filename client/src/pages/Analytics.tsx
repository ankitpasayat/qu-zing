import { useState, useEffect } from 'react';

interface Analytics {
  overview: {
    totalSessions: number;
    activeSessions: number;
    totalPlayers: number;
    totalSpectators: number;
    avgPlayersPerSession: number;
    avgRoundPerSession: number;
  };
  breakdown: {
    byPhase: Record<string, number>;
    byPlatform: Record<string, number>;
  };
  topPlayers: Array<{
    id: string;
    username: string;
    score: number;
    channelId: string;
  }>;
  sessions: Array<{
    channelId: string;
    platform: string;
    phase: string;
    players: number;
    spectators: number;
    round: number;
    totalRounds: number;
    uptime: number;
  }>;
  timestamp: number;
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('analytics_token');
      const response = await fetch('/api/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        setAuthenticated(false);
        localStorage.removeItem('analytics_token');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const data = await response.json();
      setAnalytics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const response = await fetch('/api/analytics/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const data = await response.json();
        setAuthError(data.error || 'Invalid credentials');
        return;
      }

      const { token } = await response.json();
      localStorage.setItem('analytics_token', token);
      setAuthenticated(true);
      fetchAnalytics();
    } catch {
      setAuthError('Login failed');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('analytics_token');
    if (token) {
      setAuthenticated(true);
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    
    const interval = setInterval(fetchAnalytics, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            🔐 Analytics Login
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            {authError && (
              <div className="text-red-600 text-sm text-center bg-red-50 py-2 rounded">
                {authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center">
        <div className="text-white text-2xl">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-6 rounded-lg">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      'waiting': 'bg-gray-200 text-gray-700',
      'lobby': 'bg-blue-200 text-blue-700',
      'question': 'bg-yellow-200 text-yellow-700',
      'voting': 'bg-orange-200 text-orange-700',
      'reveal': 'bg-green-200 text-green-700',
      'finished': 'bg-purple-200 text-purple-700'
    };
    return colors[phase] || 'bg-gray-200 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            📊 Qu-Zing! Analytics
          </h1>
          <p className="text-purple-200">
            Last updated: {new Date(analytics.timestamp).toLocaleString()}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('analytics_token');
              setAuthenticated(false);
            }}
            className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total Sessions" value={analytics.overview.totalSessions} />
          <StatCard label="Active Sessions" value={analytics.overview.activeSessions} />
          <StatCard label="Total Players" value={analytics.overview.totalPlayers} />
          <StatCard label="Total Spectators" value={analytics.overview.totalSpectators} />
          <StatCard label="Avg Players/Session" value={analytics.overview.avgPlayersPerSession} />
          <StatCard label="Avg Round/Session" value={analytics.overview.avgRoundPerSession} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard title="Sessions by Phase" data={analytics.breakdown.byPhase} />
          <ChartCard title="Sessions by Platform" data={analytics.breakdown.byPlatform} />
        </div>

        {/* Top Players */}
        {analytics.topPlayers.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              🏆 Top Players
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Player</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topPlayers.map((player, idx) => (
                    <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium">{player.username}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-purple-600">{player.score}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {player.channelId.substring(0, 8)}...
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Active Sessions */}
        {analytics.sessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              🎮 Active Sessions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Session ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Platform</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Phase</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Players</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Round</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Uptime</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.sessions.map((session) => (
                    <tr key={session.channelId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono">
                          {session.channelId.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm capitalize">
                          {session.platform}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm capitalize ${getPhaseColor(session.phase)}`}>
                          {session.phase}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {session.players} + {session.spectators} 👁
                      </td>
                      <td className="py-3 px-4">
                        {session.round}/{session.totalRounds}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatUptime(session.uptime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={fetchAnalytics}
          className="fixed bottom-8 right-8 bg-white text-purple-600 px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 font-semibold"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="text-gray-600 text-sm uppercase tracking-wide mb-2">{label}</div>
      <div className="text-3xl font-bold text-purple-600">{value}</div>
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-gray-500">No data</p>
        ) : (
          entries.map(([key, value]) => {
            const width = (value / max) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 capitalize">{key}</span>
                  <span className="font-bold text-purple-600">{value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
