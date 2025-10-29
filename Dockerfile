# Use Node.js 20 Alpine as base image (more compatible with FastMCP)
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies without running prepare script
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source files and build
COPY src ./src
COPY tsconfig.json ./
RUN npm run build && npm prune --omit=dev

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S todoist -u 1001

# Copy built application and package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Change ownership to non-root user
RUN chown -R todoist:nodejs /app

# Switch to non-root user
USER todoist

# Expose port for Railway deployment
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the Poke-compatible MCP server with Express wrapper
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
