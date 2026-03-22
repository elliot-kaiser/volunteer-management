# TISC volunteer site

Next.js app for Toronto Inner Sailing Club–style volunteering: members set availability, swipe/accept tasks, and message directors; directors create tasks, view assignments on a dashboard, and reply to members.

## Requirements

- **Node.js** 20+ (matches `@types/node` in this repo)
- A **Supabase** project with the database schema, Row Level Security, and RPC functions this app calls
- **SQL migrations** for that backend live under [`supabase/migrations/`](./supabase/migrations/) once you export them (see [supabase/README.md](./supabase/README.md))

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase environment variables

Without these, the app will fail at runtime (the Supabase client reads `undefined` URLs/keys).

1. In [Supabase](https://supabase.com), open your project → **Project Settings** → **API**.
2. Copy **Project URL** and the **anon public** key.
3. In the project root, copy the example env file and edit it:

```bash
cp .env.example .env.local
```

On Windows (PowerShell):

```powershell
Copy-Item .env.example .env.local
```

4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` to those values.

`lib/supabase.ts` only uses the **anon** key (safe to expose in the browser). Never put the **service role** key in `NEXT_PUBLIC_*` or commit it.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend this app expects

Point the env vars at a Supabase project that already defines (names and shapes must match what the app queries):

**Tables (public):**

| Table | Used for |
|-------|-----------|
| `profiles` | `role` (`member` / `director`), `email`, tied to `auth.users` |
| `tasks` | Volunteer shifts (title, windows, level, capacity, `created_by`, etc.) |
| `assignments` | Member–task rows with `state` (`assigned` / `completed`) |
| `messages` | Chat between members and directors |
| `availability_slots` | Member time windows |
| `availability_rules` | Recurring availability rules |

**RPCs:**

- `get_next_task(p_user_id)`
- `get_task_progress(p_user_id)`
- `accept_task(p_task_id)`
- `reject_task(p_task_id)`
- `unassign_task(p_task_id)`
- `get_rejected_available_tasks()`

**Realtime:** member/director message pages subscribe to `INSERT` on `public.messages`; enable **Realtime** for that table in Supabase if you want live updates.

If you clone this repo without applying matching SQL/migrations in Supabase, logins or queries will error until the backend matches.

### Versioning the Supabase backend on GitHub

The repo includes the [Supabase CLI](https://supabase.com/docs/guides/cli) layout (`supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`). To **export your current cloud schema** into a migration file, link the project and run `db pull` — step-by-step commands are in **[`supabase/README.md`](./supabase/README.md)**. Commit the generated SQL under `supabase/migrations/` and push; that is what puts your backend definition on GitHub (not the live database itself).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run db:login` / `db:link` / `db:pull` / `db:push` | Supabase CLI (see [`supabase/README.md`](./supabase/README.md)) |
| `npm run db:new -- your_change_name` | Creates `supabase/migrations/<timestamp>_your_change_name.sql` (no manual date prefix) |

## Deploy (e.g. Vercel)

1. Push the repo to GitHub.
2. Import the project in Vercel (or similar).
3. Add the same two variables in the host’s environment settings: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy; do not upload `.env.local` (it stays local / in the dashboard only).

---

Bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). See [Next.js documentation](https://nextjs.org/docs) for framework details.
