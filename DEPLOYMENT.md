# Deployment & database migrations

Production runs via `docker compose` (`docker-compose.yml`). The backend now applies
**versioned, non-destructive Prisma migrations** on start:

```sh
npx prisma migrate deploy && node dist/index.js
```

`migrate deploy` only applies migrations that haven't run yet. It **never** drops
tables or data. Deploying with no new migrations is a no-op.

> ⚠️ The old command was `prisma db push --force-reset && seed` — it **wiped the
> entire database and reseeded on every deploy**. That has been removed.

---

## One-time cutover (do this once)

Because prod previously had no migration history, start it from a clean baseline.
**This is the only step that deletes data — do it intentionally, ideally take a
backup first.**

1. **Ship this code** (so `docker-compose.yml` uses `migrate deploy` and the
   `prisma/migrations/` folder is present in the image).
2. **Wipe the prod database once** (run against your prod `DATABASE_URL`):
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
3. **Deploy.** On start the backend runs `migrate deploy`, which creates the full
   schema from `prisma/migrations/<timestamp>_init`.
4. **Seed once** (manual, not part of the deploy command):
   ```sh
   docker compose run --rm backend sh -c "cd apps/backend && npx tsx prisma/seed.ts"
   ```
   The seed uses upserts, so it's safe to run, but you normally only need it once.
   All seeded accounts use the password `admin123!` — **change the super-admin
   password after first login** (Profile → Change password).

After this, **every future deploy preserves data** — only new migrations are applied.

---

## Ongoing workflow (progressive, no data loss)

1. Edit `apps/backend/prisma/schema.prisma`.
2. Create a migration locally against your dev DB:
   ```sh
   pnpm --filter @wecandoleb/backend db:migrate   # prisma migrate dev
   ```
   This generates a new folder in `prisma/migrations/` and applies it locally.
3. Commit the new migration folder.
4. Deploy. Prod runs `migrate deploy`, applying only the new migration. Existing
   data is untouched.

**Never** run `db push --force-reset` or `migrate reset` against prod — both destroy data.

### Scripts (`apps/backend`)
- `db:migrate` — `prisma migrate dev` (create + apply a migration in dev)
- `db:deploy` — `prisma migrate deploy` (apply pending migrations; used in prod)
- `db:seed` — run the seed
- `db:push` — schema sync without migrations (dev convenience only; don't use in prod)

---

## Local development

Postgres runs in Docker on port **5434**:

```sh
docker compose -f docker-compose.dev.yml up -d
pnpm --filter @wecandoleb/backend db:deploy   # or db:migrate to create new ones
pnpm --filter @wecandoleb/backend db:seed
pnpm dev
```
