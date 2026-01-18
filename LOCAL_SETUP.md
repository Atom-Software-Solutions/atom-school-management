# Local Development Setup

This guide explains how to connect the application to a local PostgreSQL database named `school-management` and run the app from a fresh clone.

---

## 1. Configure environment variables

The app uses a `.env` file for configuration. Start by copying the example file:

```bash
Copy-Item .env.example .env
```

Then edit `.env` and set the `DATABASE_URL` and super admin credentials.

### Database URL

Set `DATABASE_URL` to point to your local PostgreSQL instance and the `school-management` database, for example:

```text
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/school-management"
```

Notes:

- Keep the database name as `school-management`.
- Use your actual PostgreSQL username and password instead of `postgres:your_password`.
- If PostgreSQL is running on a different host or port, update `localhost:5432` accordingly.
- You can omit the `?schema=...` query from the example file; Prisma is already configured with the schemas in `schema.prisma`.

### Super admin user

Still in `.env`, configure the initial super admin account used on first startup:

```text
SUPER_ADMIN_EMAIL=your-admin-email@example.com
SUPER_ADMIN_PASSWORD=strong-password
SUPER_ADMIN_FIRST_NAME=Support
SUPER_ADMIN_LAST_NAME=Admin
SUPER_ADMIN_PHONE=
```

These values are used to automatically create a `SUPER_ADMIN` user when the app boots.

---

## 2. Create the `school-management` database

Make sure PostgreSQL is installed and running.

Create the database (the hyphen in the name requires quoting):

```bash
psql -U postgres -c "CREATE DATABASE \"school-management\";"
```

Replace `postgres` with your database user if different.

### (Optional) Initialize schemas and grants

Run the provided SQL script against the new database:

```bash
psql -U postgres -d "school-management" -f init-db.sql
```

This creates the core schemas (e.g. `user_mgt`, `payment_mgt`, `student_mgt`) and grants privileges. Prisma migrations will later add all the tables into these schemas.

---

## 3. Apply Prisma migrations

With `.env` configured and PostgreSQL running, apply the Prisma migrations to set up the schema:

```bash
npx prisma migrate dev
```

This command will:

- Connect using `DATABASE_URL`.
- Apply all migrations from `prisma/migrations`.
- Generate the Prisma client in `generated/prisma`.

A successful run confirms the app can connect to your local `school-management` database.

---

## 4. Install dependencies

From the project root, install Node.js dependencies:

```bash
npm install
```

The project includes a `package-lock.json`, so using `npm` is recommended.

---

## 5. Run the application

### Standard run

To start the application in standard (non-watch) mode:

```bash
npm run start
```

Behavior:

- The server listens on `PORT` from `.env`, or `3000` by default.
- All routes are prefixed with `/api` (e.g. `http://localhost:3000/api`).
- On first startup, the app connects to PostgreSQL and ensures a `SUPER_ADMIN` user exists using the values from `.env`.

If the server starts without Prisma connection errors and you see logs about the SUPER_ADMIN user and the server listening, you are successfully connected to the local `school-management` database.

### Optional: Dev mode with hot reload on Windows

The existing `start:dev` script in `package.json` is Unix-style and may not work on Windows shells. You can add a Windows-friendly dev script:

```json
"start:dev:win": "set NODE_OPTIONS=-r tsconfig-paths/register && nest start --watch"
```

Then run:

```bash
npm run start:dev:win
```

This starts the server in watch mode with path aliases enabled.

---

## 6. Quick checklist

1. PostgreSQL is installed and running.
2. Database created:
   ```bash
   psql -U postgres -c "CREATE DATABASE \"school-management\";"
   ```
3. `.env` created from `.env.example` and `DATABASE_URL` points to `school-management`.
4. Prisma migrations applied:
   ```bash
   npx prisma migrate dev
   ```
5. Application running:
   ```bash
   npm run start
   ```

You should now have the application connected to your local `school-management` PostgreSQL database and running locally.