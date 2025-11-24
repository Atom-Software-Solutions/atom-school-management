# Run the Atom School Management container

## Prereqs
1. Docker installed (Desktop or Engine).
2. A `.env` file with valid values (`DATABASE_URL`, `JWT_SECRET`, etc.).

No login is required—the image is public on GHCR.

---

## Pull
```bash
docker pull ghcr.io/atom-software-solutions/atom-school-management:develop
```
Use `:main` or `:latest` if needed.

---

## Run
```bash
docker run --rm -p 3000:3000 --env-file /path/to/.env \
  ghcr.io/atom-software-solutions/atom-school-management:develop
```

Detach and name it:
```bash
docker run -d --name atom-school-app -p 3000:3000 --env-file /path/to/.env \
  ghcr.io/atom-school-solutions/atom-school-management:develop

docker stop atom-school-app
```

---

## Check it
- Health: http://localhost:3000/api/health  
- Swagger/docs: http://localhost:3000/api

---

## Common issues
| Problem | Fix |
|---------|-----|
| Exit on start | Check env vars + DB connection (`docker logs …`). |
| Port conflict | Change to `-p 3001:3000`. |
| Different tag | Replace `:develop` with `:main`, `:latest`, or a semver tag. |

---

Need DB + app with zero config? Use the provided quickstart compose file:
```bash
docker compose -f docker-compose.quickstart.yml up
```
This spins up PostgreSQL (with local data in `pgdata_quickstart`) plus the app, using the defaults baked into the compose file (`admin@example.com` / `ChangeMe123!`).

That’s it—share these commands with anyone who needs the container locally.
