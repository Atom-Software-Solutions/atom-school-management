#!/bin/bash
set -e

echo "🧪 Running Docker Tests (Same as CI/CD)..."
echo ""

# Check if PostgreSQL is running
POSTGRES_CONTAINER=""
if docker ps --format '{{.Names}}' | grep -q "^atom-school-postgres$"; then
  POSTGRES_CONTAINER="atom-school-postgres"
elif docker ps --format '{{.Names}}' | grep -q "postgres"; then
  POSTGRES_CONTAINER=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
else
  echo "⚠️  PostgreSQL container not found. Starting test database..."
  docker-compose up -d postgres
  POSTGRES_CONTAINER="atom-school-postgres"
  echo "⏳ Waiting for database to be ready..."
  sleep 5
fi

# Create test database if it doesn't exist
echo "🔍 Ensuring test database exists..."
docker exec "$POSTGRES_CONTAINER" psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'atom_school_db_test'" | grep -q 1 || \
  docker exec "$POSTGRES_CONTAINER" psql -U postgres -c "CREATE DATABASE atom_school_db_test;" || {
  echo "⚠️  Could not create database (might already exist)"
}
echo "✅ Database ready"
echo ""

# Build Docker image (same as CI/CD)
echo "🔨 Building Docker image (target: build)..."
docker build --target build -t atom-school-management:test . || {
  echo "❌ Docker build failed"
  exit 1
}
echo "✅ Build successful"
echo ""

# Run unit tests (same as CI/CD)
echo "📝 Running unit tests..."
docker run --rm \
  --network host \
  -e DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atom_school_db_test \
  -e NODE_ENV=test \
  atom-school-management:test \
  npm test || {
  echo "❌ Unit tests failed"
  exit 1
}
echo "✅ Unit tests passed"
echo ""

# Run E2E tests (same as CI/CD)
echo "🔬 Running E2E tests..."
docker run --rm \
  --network host \
  -e DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atom_school_db_test \
  -e NODE_ENV=test \
  atom-school-management:test \
  npm run test:e2e || {
  echo "❌ E2E tests failed"
  exit 1
}
echo "✅ E2E tests passed"
echo ""

echo "🎉 All Docker tests passed! Ready to push."
echo ""
echo "💡 This matches exactly what CI/CD runs in the 'Docker Test' workflow"

