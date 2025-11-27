// Load environment variables FIRST before any other imports (ES modules evaluate on import)
// Priority: .env.local (real secrets) > .env (template/defaults)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first (real secrets), then .env (template/defaults)
const envLocalPath = join(__dirname, '../../.env.local');
const envPath = join(__dirname, '../../.env');

if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

console.log('🔧 Environment loaded:');
console.log('  GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✓ set' : '✗ missing');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ set' : '✗ missing');

// Now import everything else (they'll see the env vars)
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import gameRoutes from './routes/game.js';
import analyticsRoutes from './routes/analytics.js';
import interactionsRoutes from './routes/interactions.js';
import verifyRoutes from './routes/verify.js';
import { setupSocketIO } from './routes/game.js';
import { setupRedisAdapter } from './lib/redis-adapter.js';

// Validate required environment variables
if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_CLIENT_SECRET) {
  console.error('❌ Missing required environment variables:');
  console.error('  DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID ? '✓' : '✗');
  console.error('  DISCORD_CLIENT_SECRET:', process.env.DISCORD_CLIENT_SECRET ? '✓' : '✗');
  process.exit(1);
}

console.log('✅ Environment variables loaded:');
console.log('  Client ID:', process.env.DISCORD_CLIENT_ID?.substring(0, 10) + '...');
console.log('  Client Secret:', '***' + process.env.DISCORD_CLIENT_SECRET?.substring(process.env.DISCORD_CLIENT_SECRET.length - 4));

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// CORS configuration - allow all origins for development
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Allow embedding in Discord iframe - must be before routes
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Game Routes
app.use('/api/game', gameRoutes);

// Analytics Routes (protected with auth)
app.use('/api/analytics', analyticsRoutes);

// Discord Interactions endpoint (for slash commands via HTTP)
app.use('/api/interactions', interactionsRoutes);

// Linked Roles Verification endpoint
app.use('/api/verify', verifyRoutes);

// Setup Redis adapter for horizontal scaling (optional but recommended)
await setupRedisAdapter(io);

// Setup Socket.IO handlers
setupSocketIO(io);

interface TokenRequest {
  code: string;
}

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

// Discord OAuth2 token exchange endpoint
app.post('/api/token', async (req: Request<object, object, TokenRequest>, res: Response) => {
  console.log('📨 Token exchange request received');
  const { code } = req.body;
  
  if (!code) {
    console.error('❌ No code provided in request');
    return res.status(400).json({ error: 'Code is required' });
  }

  console.log('🔑 Code received, exchanging for token...');

  try {
    const params = {
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code: code,
    };

    console.log('📤 Making request to Discord with client_id:', params.client_id.substring(0, 10) + '...');

    const response = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Discord API error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Discord API error', details: errorText });
    }

    const data = await response.json() as DiscordTokenResponse;
    console.log('✅ Token exchange successful');
    res.json(data);
  } catch (error) {
    console.error('❌ Token exchange error:', error);
    res.status(500).json({ error: 'Failed to exchange token', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    uptime: process.uptime()
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready for WebSocket connections`);
  console.log(`📱 Discord Activity ready!`);
});
