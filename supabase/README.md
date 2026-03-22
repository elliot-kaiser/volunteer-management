# Supabase backend (versioned in Git)

This folder was created with `supabase init`. **Schema changes live in `migrations/`** so you can review them in pull requests and replay them on new environments.

## One-time: log in and link your cloud project

1. Install dependencies from the repo root (`npm install`) so the Supabase CLI is available.
2. Log in:

   ```bash
   npx supabase login
   ```

3. Link the CLI to your hosted project (get **Project ref** from Supabase → **Project Settings** → **General**; use your **database password** when prompted — the same one you set when creating the project, or reset it under **Project Settings** → **Database**):

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

## Pull the current remote schema into a migration (first export)

If your database was built in the Dashboard and you have no migrations yet:

```bash
npx supabase db pull remote_schema
```

That creates a new SQL file under `migrations/`. Commit it and push to GitHub.

### “Migration history does not match” after the first pull

If the database was created in the **Dashboard** (not via `db push`), the hosted project usually has **no** (or an older) record for your new migration file, even though the schema is already there. The CLI then errors until you **mark that migration as already applied** (this does **not** re-run the SQL):

```bash
npx supabase migration repair --status applied 20260322034725
```

Use the **exact version** from the error message (the digits before `_` in your `supabase/migrations/<timestamp>_name.sql` file). If the CLI suggests a different timestamp, use that one.

If the CLI lists **several** `migration repair` lines, run **each** in order (oldest timestamp first), for example:

```bash
npx supabase migration repair --status applied 20260322034725
npx supabase migration repair --status applied 20260322035934
```

After that, **remove any accidental empty migrations** you do not want in history (e.g. a smoke-test file). Delete the `*_name.sql` file from `migrations/`, then mark that version **reverted** on the remote so the server history matches your folder:

```bash
npx supabase migration repair --status reverted 20260322035934
```

(Use the version that matches the file you deleted.)

Do **not** keep non-migration files in `migrations/` (e.g. `.gitkeep`); only `*_*.sql` files belong there.

**Alternative:** pass the DB password non-interactively:

```bash
npx supabase db pull remote_schema -p "YOUR_DB_PASSWORD"
```

Or use **Settings → Database → Connection string** (URI) with `--db-url` (must be [percent-encoded](https://supabase.com/docs/guides/cli/managing-environments)).

## Future schema changes (normal workflow)

You do **not** hand-type `YYYYMMDDHHMMSS` filenames. From the **repo root**:

1. **Create** an empty migration with the right timestamp (pick a short snake_case name):

   ```bash
   npm run db:new -- add_notifications_table
   ```

   The CLI writes `supabase/migrations/<timestamp>_add_notifications_table.sql`.

2. **Edit** that file: put only the SQL for this change (`CREATE TABLE`, `ALTER TABLE`, new RPC, RLS policy, etc.).

3. **Commit** the file to Git.

4. **Apply** to your linked Supabase project (Docker must be running — same as `db pull`):

   ```bash
   npm run db:push
   ```

   Run that on your machine after `supabase link`; it cannot be run from CI unless you set that up with secrets.

## Apply migrations to another environment

With the project linked:

```bash
npx supabase db push
```

(Review [Supabase CLI docs](https://supabase.com/docs/guides/cli) for flags and production cautions.)

## Local Supabase (optional)

Requires Docker. From the repo root:

```bash
npx supabase start
```

Use `npx supabase status` for local URLs and keys.
