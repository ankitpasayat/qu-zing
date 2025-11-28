import { Router, Request, Response } from 'express';

const router = Router();

// Discord interaction types
enum InteractionType {
  PING = 1,
  APPLICATION_COMMAND = 2,
  MESSAGE_COMPONENT = 3,
  APPLICATION_COMMAND_AUTOCOMPLETE = 4,
  MODAL_SUBMIT = 5,
}

// Discord interaction response types
enum InteractionResponseType {
  PONG = 1,
  CHANNEL_MESSAGE_WITH_SOURCE = 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
  DEFERRED_UPDATE_MESSAGE = 6,
  UPDATE_MESSAGE = 7,
  APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
  MODAL = 9,
}

interface DiscordInteraction {
  id: string;
  application_id: string;
  type: InteractionType;
  data?: {
    id: string;
    name: string;
    options?: Array<{
      name: string;
      type: number;
      value: unknown;
    }>;
    custom_id?: string;
    component_type?: number;
  };
  guild_id?: string;
  channel_id?: string;
  member?: {
    user: {
      id: string;
      username: string;
      discriminator: string;
      avatar: string | null;
    };
    roles: string[];
    permissions: string;
  };
  user?: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  token: string;
  version: number;
}

// Verify Discord request signature
function verifyDiscordRequest(
  signature: string | undefined,
  timestamp: string | undefined,
  body: string
): boolean {
  if (!signature || !timestamp) {
    return false;
  }

  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.error('❌ DISCORD_PUBLIC_KEY not configured');
    return false;
  }

  try {
    // Discord uses Ed25519 signatures
    // For proper verification, install tweetnacl: npm install tweetnacl
    // Then use: nacl.sign.detached.verify(message, signature, publicKey)
    const _message = timestamp + body;
    
    // SECURITY: In development, log a warning but allow requests through
    // In production (NODE_ENV=production), reject unverified requests
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ Discord signature verification not implemented - install tweetnacl for production');
      return false;
    }
    
    console.warn('⚠️ Discord signature verification bypassed in development - implement tweetnacl for production');
    return true;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// Raw body parser middleware for signature verification
router.use((req: Request, res: Response, next) => {
  // The body has already been parsed by express.json()
  // For signature verification, we need the raw body
  // This is handled by storing raw body in app.use before routes
  next();
});

// Discord Interactions endpoint
router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['x-signature-ed25519'] as string;
  const timestamp = req.headers['x-signature-timestamp'] as string;
  
  // Get raw body for verification (you may need to configure this in server.ts)
  const rawBody = JSON.stringify(req.body);
  
  // Verify the request is from Discord
  if (!verifyDiscordRequest(signature, timestamp, rawBody)) {
    console.warn('⚠️ Invalid Discord signature');
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  const interaction = req.body as DiscordInteraction;
  
  console.log('📨 Discord interaction received:', {
    type: interaction.type,
    id: interaction.id,
    commandName: interaction.data?.name,
  });

  // Handle PING (required for Discord URL verification)
  if (interaction.type === InteractionType.PING) {
    console.log('🏓 Responding to Discord PING');
    return res.json({ type: InteractionResponseType.PONG });
  }

  // Handle Application Commands (slash commands)
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name;
    
    switch (commandName) {
      case 'play':
        // Start a trivia game
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '🎮 **Qu-Zing! Trivia**\n\nStart a trivia game in your voice channel!\n\n1. Join a voice channel\n2. Click the Activities button (🚀)\n3. Select "Qu-Zing!" from the list\n\nHave fun! 🎉',
            flags: 64, // Ephemeral message
          },
        });

      case 'help':
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '**Qu-Zing! Help**\n\n🎮 **How to Play:**\n• Join a voice channel and start the activity\n• Answer trivia questions and bet tokens (1-10) based on confidence\n• Correct = keep points • Wrong = lose that token forever\n• The player with the most points wins!\n\n⚡ **Power-ups & Bonuses:**\n• **Double Down (x2)** / **Safety Net** / **50/50** — strategic abilities\n• **🔥 Streak Fire:** 2+ correct in a row = bonus points\n• **⚡ Speed Demon:** Answer in first 3s = +2 points\n• **🎰 Endgame Gambit:** Round 8+ — answer 3 in a row for 2x bonus!\n• **📈 Comeback Bonus:** Bottom 50% get 1.2x multiplier\n\n📊 **Commands:**\n• `/play` - Get instructions to start a game\n• `/help` - Show this help message\n• `/stats` - View your game statistics',
            flags: 64,
          },
        });

      case 'stats':
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '📊 **Your Qu-Zing! Stats**\n\nStats tracking coming soon!\n\nPlay more games to build your statistics.',
            flags: 64,
          },
        });

      default:
        return res.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: '❓ Unknown command. Try `/help` for available commands.',
            flags: 64,
          },
        });
    }
  }

  // Handle Message Components (buttons, select menus)
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id;
    
    console.log('🔘 Component interaction:', customId);
    
    return res.json({
      type: InteractionResponseType.UPDATE_MESSAGE,
      data: {
        content: 'Component interaction received!',
      },
    });
  }

  // Handle Modal Submissions
  if (interaction.type === InteractionType.MODAL_SUBMIT) {
    return res.json({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: 'Form submitted successfully!',
        flags: 64,
      },
    });
  }

  // Unknown interaction type
  console.warn('⚠️ Unknown interaction type:', interaction.type);
  return res.status(400).json({ error: 'Unknown interaction type' });
});

export default router;
