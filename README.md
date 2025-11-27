# Qu-Zing!

Real-time multiplayer trivia game for Discord Activities and Browser/PWA.

## Prerequisites

- **Node.js** (v20+) and **npm**
- **cloudflared** - for public tunnel (`sudo pacman -S cloudflared` / `brew install cloudflared`)
- **Docker & Docker Compose** - only for `./dev.sh docker` mode

## Quick Start

```bash
# 1. Install dependencies
cd client && npm install && cd ..
cd server && npm install && cd ..

# 2. Configure environment
cp .env .env.local
# Edit .env.local with your credentials (see Configuration below)

# 3. Run in hot reload mode (recommended for development)
./dev.sh hot
```

You'll get a public URL like `https://xyz.trycloudflare.com` — use this in Discord Developer Portal.

## Development Modes

| Command | Description |
|---------|-------------|
| `./dev.sh hot` | Hot reload — fastest for development |
| `./dev.sh docker` | Docker Compose — tests horizontal scaling |
| `./dev.sh` | Kubernetes (Minikube) — production-like |

## Configuration

Create `.env.local` with your values:

```bash
# Required - get from https://discord.com/developers/applications
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Required - get free key from https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_google_api_key

# Analytics dashboard (optional)
ANALYTICS_USERNAME=admin
ANALYTICS_PASSWORD=your_password
```

### Discord Developer Portal Setup

1. Run `./dev.sh hot` and copy the tunnel URL
2. Go to [Discord Developer Portal](https://discord.com/developers/applications)
3. **OAuth2 → Redirects:** Add `https://xyz.trycloudflare.com/`
4. **Activities → URL Mapping:** Root `/` → `https://xyz.trycloudflare.com`
5. Wait 5-10 minutes for Discord to propagate changes

## Project Structure

```
client/     # React + Vite + Tailwind (port 5173)
server/     # Express + Socket.IO (port 3000)
shared/     # Shared TypeScript types
k8s/        # Kubernetes manifests (optional)
```

## Useful Commands

```bash
# Run tests
cd client && npm test
cd server && npm test

# View Docker logs
docker-compose logs -f

# Stop Docker services
docker-compose down
```

## License

Proprietary. See [LICENSE](LICENSE) for details.
