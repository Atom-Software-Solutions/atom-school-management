# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and dependencies
COPY package*.json ./
COPY prisma ./prisma/
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
# Note: Prisma generate doesn't require DATABASE_URL, but we verify it succeeds
RUN npx prisma generate

# Verify generated Prisma Client exists (fail fast if generation failed)
RUN test -d generated/prisma || (echo "ERROR: Generated Prisma Client not found at generated/prisma" && exit 1)

# Build the application
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production

WORKDIR /app

# Install build tools for native dependencies (bcrypt, etc.) and production dependencies
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npm cache clean --force && \
    apk del python3 make g++

# Copy built application and generated Prisma Client
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated

# Verify critical files exist (Prisma already verified in build stage, but check main.js)
RUN test -f dist/src/main.js || (echo "ERROR: dist/src/main.js not found. Build may have failed." && exit 1)

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application using the start:prod script which includes tsconfig-paths
CMD ["npm", "run", "start:prod"]
