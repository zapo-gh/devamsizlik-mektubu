# OkulDesk Database Policy

## Single source of truth

`prisma/schema.prisma` is the authoritative database schema.

`src/modules/shared/utils/initDb.ts` **does not create or alter tables**. It only applies SQLite runtime PRAGMAs (`WAL` and foreign-key enforcement).

## Development

After changing `schema.prisma`:

```bash
npm run prisma:migrate
npm run prisma:generate
```

Do not manually edit generated Prisma Client files.

## Production / packaged application

Production deployments must apply committed Prisma migrations before starting the application:

```bash
npm run prisma:migrate:prod
npm run prisma:generate
```

The application startup intentionally does not run `prisma migrate dev`, because that command is a development workflow and can modify the database interactively.

## Important current-state note

The repository currently has no committed `prisma/migrations` directory. Therefore a migration baseline must be generated from a known-good database before enabling `prisma migrate deploy` for existing installations.

Do **not** create a migration by guessing the current SQLite schema. For an existing school installation, first copy and verify the database backup, then create a baseline migration from that exact schema.

## SQLite operational requirements

- Keep foreign keys enabled.
- Keep WAL enabled for normal operation.
- Backups must use SQLite-aware backup mechanisms (for example `VACUUM INTO`) rather than copying a live database file while it is being written.
- Never commit `.db`, `.sqlite`, or backup files to Git.

## Safe rollout sequence

1. Take a verified backup.
2. Generate a baseline migration from the actual production schema.
3. Test the migration against a disposable copy of the production database.
4. Test application startup and representative CRUD/report/OCR flows.
5. Only then enable migration deployment in the packaged release.
