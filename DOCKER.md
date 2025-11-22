# Docker Deployment Guide

This guide explains how to run the Atom School Management API using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### 1. Clone and Setup

```bash
cd atom-school-management
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your configuration:

```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/atom_school_db?schema=user_mgt&schema=payment_mgt&schema=student_mgt
JWT_SECRET=your-super-secret-jwt-key
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=SecurePassword123!

# Optional
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@example.com
```

### 3. Run with Docker Compose

**Production mode:**
```bash
docker-compose up -d
```

**Development mode:**
```bash
docker-compose -f docker-compose.dev.yml up
```

### 4. Access the Application

- API: http://localhost:3000/api
- Health Check: http://localhost:3000/api/health
- Swagger Documentation: http://localhost:3000/api

## Development Workflow

### Start Development Environment

```bash
docker-compose -f docker-compose.dev.yml up
```

This will:
- Start PostgreSQL database
- Start the NestJS app in watch mode (auto-reload on code changes)
- Mount your local code for live development

### Run Database Migrations

```bash
# Inside the app container
docker-compose exec app npx prisma migrate deploy

# Or from your local machine (if Prisma is installed)
npx prisma migrate deploy
```

### Generate Prisma Client

```bash
docker-compose exec app npx prisma generate
```

### Access Database

```bash
# Using psql
docker-compose exec postgres psql -U postgres -d atom_school_db

# Or using Prisma Studio
docker-compose exec app npx prisma studio
```

## Production Deployment

### Build and Run

```bash
# Build the image
docker build -t atom-school-management .

# Run the container
docker run -d \
  --name atom-school-app \
  -p 3000:3000 \
  --env-file .env \
  atom-school-management
```

### Using Docker Compose (Production)

```bash
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Stop Services

```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (⚠️ deletes database data)
docker-compose down -v
```

## Docker Commands Reference

### Build

```bash
# Build production image
docker build -t atom-school-management .

# Build development image
docker build -f Dockerfile.dev -t atom-school-management:dev .
```

### Run

```bash
# Run production container
docker run -p 3000:3000 --env-file .env atom-school-management

# Run with interactive shell
docker run -it --env-file .env atom-school-management sh
```

### Database Operations

```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
docker-compose exec app npx prisma migrate reset

# Seed database (if you have seed script)
docker-compose exec app npm run seed

# Prisma Studio (Database GUI)
docker-compose exec app npx prisma studio
```

### Debugging

```bash
# View container logs
docker-compose logs -f app

# Execute commands in container
docker-compose exec app sh

# Check container status
docker-compose ps

# View resource usage
docker stats
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `SUPER_ADMIN_EMAIL` | Super admin email | `admin@example.com` |
| `SUPER_ADMIN_PASSWORD` | Super admin password | `SecurePassword123!` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `NODE_ENV` | Environment mode | `production` |
| `SMTP_HOST` | SMTP server host | - |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | From email address | - |

## Database Schemas

The application uses three PostgreSQL schemas:
- `user_mgt` - User and school management
- `payment_mgt` - Payment and billing
- `student_mgt` - Student management

These are automatically created when the database initializes.

## Troubleshooting

### Container won't start

1. Check logs: `docker-compose logs app`
2. Verify environment variables: `docker-compose config`
3. Ensure database is healthy: `docker-compose ps`

### Database connection errors

1. Verify `DATABASE_URL` is correct
2. Check if PostgreSQL container is running: `docker-compose ps postgres`
3. Test connection: `docker-compose exec postgres pg_isready`

### Port already in use

Change the port in `.env`:
```env
PORT=3001
POSTGRES_PORT=5433
```

### Prisma Client not generated

```bash
docker-compose exec app npx prisma generate
```

### Reset everything

```bash
# Stop and remove everything including volumes
docker-compose down -v

# Remove images
docker rmi atom-school-management

# Start fresh
docker-compose up -d
```

## Production Considerations

1. **Security**
   - Use strong `JWT_SECRET`
   - Change default database passwords
   - Use secrets management (Docker secrets, AWS Secrets Manager, etc.)
   - Enable SSL/TLS for database connections

2. **Performance**
   - Use connection pooling for database
   - Configure appropriate resource limits
   - Use multi-stage builds (already implemented)
   - Enable health checks

3. **Monitoring**
   - Set up logging aggregation
   - Monitor container health
   - Track application metrics
   - Set up alerts

4. **Backup**
   - Regular database backups
   - Volume snapshots
   - Disaster recovery plan

## Docker Compose Overrides

You can create `docker-compose.override.yml` for local customizations:

```yaml
version: '3.8'
services:
  app:
    volumes:
      - ./local-override:/app/override
```

This file is automatically loaded by Docker Compose.

## Next Steps

1. Set up CI/CD pipeline
2. Configure production environment variables
3. Set up database backups
4. Configure monitoring and logging
5. Set up SSL/TLS certificates
6. Configure reverse proxy (nginx, traefik, etc.)


