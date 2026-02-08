# ============================================
# THE HOLD - WebSocket Server Dockerfile
# ============================================

# --------------------------------------------
# Stage 1: Dependencies
# --------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# --------------------------------------------
# Stage 2: Builder
# --------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript
RUN npx tsc --project tsconfig.ws.json

# --------------------------------------------
# Stage 3: Runner
# --------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 websocket
RUN adduser --system --uid 1001 websocket

# Copy necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/websocket ./dist/websocket
COPY --from=builder /app/dist/lib ./dist/lib
COPY --from=builder /app/dist/types ./dist/types

# Set up permissions for data directory
RUN mkdir -p /app/data && chown -R websocket:websocket /app/data

# Switch to non-root user
USER websocket

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start the WebSocket server
CMD ["node", "dist/websocket/ws-server.js"]
