import { Router, Request, Response } from 'express';

const router = Router();

// Discord Linked Roles metadata types
interface ConnectionMetadata {
  platform_name: string;
  platform_username: string;
  metadata: Record<string, string | number | boolean>;
}

// Store for verification states (in production, use Redis or database)
const verificationStates = new Map<string, { 
  userId: string; 
  guildId?: string;
  timestamp: number;
}>();

// Clean up old states periodically
/* istanbul ignore next */
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [key, value] of verificationStates) {
    if (now - value.timestamp > maxAge) {
      verificationStates.delete(key);
    }
  }
}, 60 * 1000); // Check every minute

// Linked Roles verification page
router.get('/', async (req: Request, res: Response) => {
  const { code, state: _state } = req.query;

  // If no code, show the verification landing page
  if (!code) {
    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify - Qu-Zing!</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .logo { font-size: 48px; margin-bottom: 20px; }
    h1 { color: #1a1a2e; margin-bottom: 16px; font-size: 28px; }
    p { color: #666; line-height: 1.6; margin-bottom: 24px; }
    .button {
      display: inline-block;
      background: #5865F2;
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s;
    }
    .button:hover { background: #4752c4; }
    .features {
      text-align: left;
      margin: 24px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
    }
    .features h3 { color: #1a1a2e; margin-bottom: 12px; font-size: 16px; }
    .features ul { padding-left: 20px; color: #666; }
    .features li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🎮</div>
    <h1>Qu-Zing! Verification</h1>
    <p>Connect your Discord account to unlock special roles and features in participating servers.</p>
    
    <div class="features">
      <h3>🏆 Unlock These Benefits:</h3>
      <ul>
        <li>Verified Player role</li>
        <li>Access to exclusive channels</li>
        <li>Display your game stats</li>
        <li>Participate in tournaments</li>
      </ul>
    </div>
    
    <a href="/api/verify/start" class="button">
      Verify with Discord
    </a>
  </div>
</body>
</html>
    `);
  }

  // Handle OAuth callback with code
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: `${process.env.APP_URL || 'https://your-domain.com'}/api/verify`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json() as { 
      access_token: string; 
      token_type: string;
      scope?: string;
    };

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const user = await userResponse.json() as {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
    };

    // Update user's linked role metadata
    // This requires the role_connections.write scope
    if (tokenData.scope?.includes('role_connections.write')) {
      const metadata: ConnectionMetadata = {
        platform_name: 'Qu-Zing!',
        platform_username: user.username,
        metadata: {
          verified: true,
          games_played: 0, // Would fetch from database
          verified_at: Math.floor(Date.now() / 1000),
        },
      };

      await fetch(`https://discord.com/api/users/@me/applications/${process.env.DISCORD_CLIENT_ID}/role-connection`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });
    }

    // Show success page
    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verified! - Qu-Zing!</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .success { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1a1a2e; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
    .username { color: #5865F2; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✅</div>
    <h1>Verification Complete!</h1>
    <p>Welcome, <span class="username">${user.username}</span>!</p>
    <p style="margin-top: 16px;">Your Discord account is now verified with Qu-Zing! You can close this window and return to Discord.</p>
  </div>
</body>
</html>
    `);
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error - Qu-Zing!</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .error { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1a1a2e; margin-bottom: 16px; }
    p { color: #666; line-height: 1.6; }
    .button {
      display: inline-block;
      background: #5865F2;
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error">❌</div>
    <h1>Verification Failed</h1>
    <p>Something went wrong during verification. Please try again.</p>
    <a href="/api/verify" class="button">Try Again</a>
  </div>
</body>
</html>
    `);
  }
});

// Start OAuth flow
router.get('/start', (req: Request, res: Response) => {
  const state = Math.random().toString(36).substring(7);
  const redirectUri = `${process.env.APP_URL || 'https://your-domain.com'}/api/verify`;
  
  // Build OAuth URL
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: 'identify role_connections.write',
    prompt: 'consent',
  });

  const authUrl = `https://discord.com/oauth2/authorize?${params}`;
  
  // Store state for verification
  verificationStates.set(state, {
    userId: '',
    timestamp: Date.now(),
  });

  res.redirect(authUrl);
});

// Register linked role metadata (call this once during setup)
router.post('/register-metadata', async (req: Request, res: Response) => {
  // This requires a bot token, not user token
  const botToken = process.env.DISCORD_BOT_TOKEN;
  
  if (!botToken) {
    return res.status(400).json({ error: 'DISCORD_BOT_TOKEN not configured' });
  }

  const metadata = [
    {
      key: 'verified',
      name: 'Verified Player',
      description: 'User has verified their Qu-Zing! account',
      type: 7, // Boolean
    },
    {
      key: 'games_played',
      name: 'Games Played',
      description: 'Number of trivia games played',
      type: 2, // Integer >= 
    },
    {
      key: 'verified_at',
      name: 'Verified Since',
      description: 'When the user verified their account',
      type: 6, // DateTime >=
    },
  ];

  try {
    const response = await fetch(
      `https://discord.com/api/applications/${process.env.DISCORD_CLIENT_ID}/role-connections/metadata`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register metadata: ${error}`);
    }

    const result = await response.json();
    res.json({ success: true, metadata: result });
  } catch (error) {
    console.error('Failed to register metadata:', error);
    res.status(500).json({ error: 'Failed to register metadata' });
  }
});

export default router;
