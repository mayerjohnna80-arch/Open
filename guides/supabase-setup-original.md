# Wiring Venice GSC into Supabase — your exact next steps

This is your step-by-step for turning the demo (`venice-gsc-registration.html`)
into a **real website** where families across the world create accounts, and
where only you can grant admin access. It's written assuming you've never used a
database. Take it one step at a time; nothing here requires you to be technical,
and the parts that touch code are ones you can hand to Claude Code.

**What Supabase is, in one line:** a free service that gives your site secure
logins and a shared database, so accounts work across everyone's devices and
passwords are stored safely (never in plain text).

**Roughly how long:** about an hour for steps 1–6 (clicking around Supabase),
then the code-wiring in step 7 is where Claude Code does the heavy lifting.

---

## Step 1 — Create your Supabase account and project
1. Go to **supabase.com** and click **Start your project**. Sign in with GitHub
   or email (creating a GitHub account is free if you don't have one).
2. Click **New project**. Give it a name like `venice-gsc`.
3. It asks for a **database password** — click Generate, then **copy it
   somewhere safe** (a password manager or notes you won't lose).
4. Pick the region closest to you (e.g. West US). Click **Create new project**
   and wait a minute or two while it sets up.

## Step 2 — Find your two connection keys
Your website needs two values to talk to Supabase.
1. In your project, click the **gear icon (Project Settings)** in the left
   sidebar, then **API**.
2. You'll see **Project URL** and, under Project API keys, the **anon public**
   key. Copy both into your safe notes. Labelled clearly:
   - `Project URL` — looks like `https://abcxyz.supabase.co`
   - `anon public key` — a long string of letters and numbers.

> The "anon public" key is safe to put in your website. Do **not** use the
> "service_role" key in the website — that one is secret. If you see a key
> labelled service_role, leave it alone.

## Step 3 — Create the database tables
This makes the two "spreadsheets" your data lives in: one for profiles (who's a
parent vs. admin) and one for players.
1. In the left sidebar, click the **SQL Editor** (looks like a terminal icon).
2. Click **New query**, paste in the block below exactly, and click **Run**.

```sql
-- Profiles: one row per account, holding their name and role.
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  role text not null default 'parent',   -- 'parent' or 'admin'
  created_at timestamptz default now()
);

-- Players: each child, linked to the parent who registered them.
create table players (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid references auth.users on delete cascade not null,
  name text not null,
  dob date,
  age_group text,
  position text,
  shirt_size text,
  emergency_contact text,
  created_at timestamptz default now()
);
```

You should see "Success. No rows returned." That's correct — you just built the
empty tables.

## Step 4 — Turn on the security rules (this is the important one)
These rules are what make sure a parent can only see **their own** kids, while
admins can see everyone — enforced by the database itself, not just the website.
Paste this whole block into a new SQL query and **Run** it.

```sql
-- Lock both tables so nothing is readable without a rule allowing it.
alter table profiles enable row level security;
alter table players  enable row level security;

-- A helper the rules use to check if the logged-in person is an admin.
create or replace function is_admin() returns boolean as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- PROFILES rules
create policy "see own profile or admin sees all"
  on profiles for select
  using ( id = auth.uid() or is_admin() );

create policy "create own profile"
  on profiles for insert
  with check ( id = auth.uid() );

-- Only admins can change a role (e.g. promote a parent to admin).
create policy "admin updates profiles"
  on profiles for update
  using ( is_admin() );

-- PLAYERS rules
create policy "parent sees own players, admin sees all"
  on players for select
  using ( parent_id = auth.uid() or is_admin() );

create policy "parent adds own players"
  on players for insert
  with check ( parent_id = auth.uid() );

create policy "parent edits own players"
  on players for update
  using ( parent_id = auth.uid() );

create policy "parent removes own players"
  on players for delete
  using ( parent_id = auth.uid() );
```

That's the entire security model: parents are boxed into their own family,
admins can see the club, and role changes are admin-only.

## Step 5 — Make a new profile appear automatically on sign-up
This fills in the profiles table whenever someone registers. New SQL query, run
it:

```sql
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, 'parent');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

## Step 6 — Make yourself the owner/admin
1. Open your live site (or the demo) and **register the account you want as
   owner** — use the email you'll actually use to run the club.
2. Back in Supabase, open the **SQL Editor** and run this, swapping in that
   email:

```sql
update profiles set role = 'admin'
where email = 'you@venicegsc.com';
```

From now on, you promote other admins from inside the site's **Admin access**
tab — but this first one has to be done here in Supabase, because there's no
admin yet to do it. This is the "only you can grant access" rule working as
intended.

## Step 7 — Connect the website to Supabase (hand this to Claude Code)
Open the project folder in **Claude Code** and give it this instruction,
pasting in your two keys from Step 2:

> "Wire `venice-gsc-registration.html` into Supabase using the Supabase
> JavaScript client. My Project URL is `<paste>` and my anon key is `<paste>`.
> Replace the demo logic at every `>>> BACKEND HANDOFF` marker:
> - Use Supabase Auth for register and login (pass the name in user metadata).
> - Save, edit, and remove players in the `players` table with `parent_id` set
>   to the logged-in user.
> - The admin roster should read all players; the row-level security policies
>   already restrict this to admins.
> - Granting admin should update a profile's `role` to 'admin' by email.
> Keep the existing design and screens exactly as they are."

Claude Code knows the Supabase client library and will swap the plumbing while
leaving the look and flow intact. The `>>> BACKEND HANDOFF` comments in the file
mark every spot it needs to touch.

## Step 8 — Put it online
To give families a link:
1. Make a free account at **netlify.com** (or vercel.com).
2. Drag your finished HTML file (and any files Claude Code adds) onto Netlify's
   upload area, or connect it to a GitHub repo.
3. Netlify gives you a web address with the padlock (HTTPS) already on. Share
   that link with your club.

---

## A few honest reminders
- **The security rules in Steps 4–5 are not optional.** They're what keep one
  family from seeing another's data and stop a parent from making themselves an
  admin. Don't skip them.
- **Children's data carries responsibility.** In the U.S., collecting info on
  under-13s involves a law called COPPA; a quick check with your league or a
  lawyer before going live is worth it. Collect only what you need.
- **Free tier is plenty** for a club your size. You'll only pay if you grow a
  lot.
- **You don't have to do Step 7 yourself.** That's the one coding step, and it's
  exactly what Claude Code is for — you supply the keys, it writes the wiring.

That's the whole path: click through Supabase (Steps 1–6), have Claude Code
connect it (Step 7), publish on Netlify (Step 8). Do them in order and you'll
have a real, secure registration site for Venice Girls Soccer Club.
