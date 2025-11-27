# Multi-stage build for Express server
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Update npm to latest version
RUN npm install -g npm@11.6.4

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files and npmrc
COPY package*.json .npmrc ./

# Update npm to latest version
RUN npm install -g npm@11.6.4

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY discord.config.json ./

# Create logs directory
RUN mkdir -p logs

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

CMD ["node", "dist/server.js"]
