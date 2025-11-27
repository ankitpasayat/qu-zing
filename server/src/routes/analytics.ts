import express, { Request, Response } from 'express';
import { getAnalytics } from '../lib/game-manager.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Simple JWT generation (for basic auth)
function generateToken(username: string): string {
  const payload = JSON.stringify({ username, exp: Date.now() + 24 * 60 * 60 * 1000 }); // 24h expiry
  return Buffer.from(payload).toString('base64');
}

function verifyToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

// Middleware to check authentication
function authenticate(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  next();
}

/**
 * Login endpoint
 */
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  const validUsername = process.env.ANALYTICS_USERNAME;
  const validPassword = process.env.ANALYTICS_PASSWORD;

  // Require credentials to be configured via environment variables
  if (!validUsername || !validPassword) {
    logger.error('Analytics credentials not configured - ANALYTICS_USERNAME and ANALYTICS_PASSWORD must be set');
    return res.status(503).json({ error: 'Analytics not configured' });
  }

  if (username === validUsername && password === validPassword) {
    const token = generateToken(username);
    logger.info(`Analytics login successful for user: ${username}`);
    res.json({ token });
  } else {
    logger.warn(`Failed analytics login attempt for user: ${username}`);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

/**
 * Analytics endpoint - returns game statistics (protected)
 */
router.get('/', authenticate, (_req: Request, res: Response) => {
  const analytics = getAnalytics();
  res.json(analytics);
});

export default router;
