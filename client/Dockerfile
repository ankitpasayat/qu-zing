# Multi-stage build for React/Vite client
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

# Accept build args for Vite environment variables
ARG VITE_DISCORD_CLIENT_ID
ARG VITE_API_URL
ARG VITE_SERVER_URL

# Set them as environment variables for the build
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
