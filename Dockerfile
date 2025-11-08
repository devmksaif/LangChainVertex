# Production multi-stage Dockerfile

# 1) Builder: install deps (including dev) and build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack and pnpm
RUN corepack enable && corepack prepare pnpm@^8.0.0 --activate

# Copy package manifests and install all deps (needed to build)
COPY package.json pnpm-lock.yaml* ./
# Allow installs even when the lockfile is out of date inside the build.
# In CI/production you may prefer updating lockfile locally and committing it instead.
RUN pnpm install --no-frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# 2) Runner: install only production deps and copy built output
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

RUN corepack enable && corepack prepare pnpm@^8.0.0 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --no-frozen-lockfile && pnpm store prune

# Copy built output from builder
COPY --from=builder /app/dist ./dist

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
EXPOSE 5000

# Run the compiled JS
CMD ["pnpm", "run", "start"]
