# Run the Atom School Management container

## Prereqs
1. Docker installed (Desktop or Engine).
2. A `.env` file with valid values (`DATABASE_URL`, `JWT_SECRET`, etc.).

No login is required—the image is public on GHCR.

---

## Clone + enter the repo
```bash
git clone https://github.com/atom-software-solutions/atom-school-management.git
cd atom-school-management
```

## Start everything with Compose
```bash
docker compose -f docker-compose.quickstart.yml up
```
- Pulls the public image from GHCR (no manual `docker pull` needed).
- No `.env` file required—the compose file already wires reasonable defaults.
- Launches PostgreSQL + the app, applies migrations, and streams logs.
- The compose file pins the app service to `linux/amd64`, so Apple Silicon hosts
  work out of the box.

Run it in the background with `... up -d` and watch logs via
`docker compose -f docker-compose.quickstart.yml logs -f app`.

## Stop the stack
```bash
docker compose -f docker-compose.quickstart.yml down
```
Add `-v` if you also want to remove the local `pgdata_quickstart` volume.

---

## Check it
- App health: http://localhost:3000/api/health  
- Swagger/docs: http://localhost:3000/api
- Postgres: localhost:5433 (user/pass `postgres` / `postgres`)
- App login: `admin@example.com` / `ChangeMe123!`

---

## Common issues
| Problem | Fix |
|---------|-----|
| Docker not running | Start Docker Desktop/Engine, then rerun the compose command. |
| Port conflict | Edit `docker-compose.quickstart.yml` (ports 3000/5433) before running. |
| Clean slate needed | `docker compose -f docker-compose.quickstart.yml down -v`. |
| Need custom env | Duplicate the compose file and edit the `environment` block. |

---

Share these instructions with anyone who needs the container locally—everything
they need is in this repo + the compose quickstart.*** End Patch*** End Patch
```
