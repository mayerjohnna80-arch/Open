# Getting your OPEN domain on Cloudflare — step by step

A plain, no-experience-needed walkthrough. Buying a domain here takes about
15 minutes. Have a payment method (credit card) and a couple of name ideas ready.

Why Cloudflare: it sells domains **at cost with no markup or upsells**, includes
domain privacy (hides your home address) for free, and renews at the same price
every year — no "first year cheap, then expensive" trick that some registrars use.

---

## Before you start
- Pick 2–3 name ideas, since your first choice may be taken. Because plain
  "open" is gone, pair it with a word or suffix: **openfilm.com**, **getopen.com**,
  **open.coach**, **openpitch.com**, **playopen.com**.
- Have a credit card ready.
- Use the email you want tied to the account long-term (ideally your future
  club email — this can become your OWNER login later).

## Step 1 — Create a free Cloudflare account
1. Go to **cloudflare.com** and click **Sign up**.
2. Enter your email and create a password, then click **Create Account**.
3. Open the verification email from Cloudflare and click the link inside. (No
   email? Check spam, or request a new one.) You're now logged into the
   **dashboard** — the control panel for everything.

## Step 2 — Open the domain registration area
1. In the dashboard, look at the **left-side menu**.
2. Click **Domain Registration**, then the sub-item **Register Domains**.

> Cloudflare requires a verified account email before you can register — if it
> nudges you to confirm your email first, do that, then come back here.

## Step 3 — Search for your name
1. In the search box, type a name idea (e.g. `openfilm`) and press **Search**.
   You can type just the word and it'll show options across endings (.com, .co,
   .app…), or type the full thing like `openfilm.com`.
2. Read the results. Each available domain shows its **yearly price** (most
   common endings are ~$10–12/year).
3. If your exact idea isn't in the list, that ending is taken — try another
   name or another ending from your backup list.

**Quick tips choosing:**
- A **.com** is the most recognized if you can get a good one.
- **.co**, **.app**, **.coach**, **.club** are all fine, modern alternatives.
- Shorter and easy-to-say-out-loud wins — imagine a parent hearing it once.

## Step 4 — Purchase it
1. Click **Purchase** next to the domain you want. Cloudflare does a final
   availability check to confirm it's really free.
2. Choose the **term** (how many years). **1 year is fine** to start.
3. **Leave Auto-renew ON.** This is important — it stops you from accidentally
   losing the name next year by forgetting to renew.
4. Fill in your **contact info** (name, address — this is required by the rules
   that govern domains, but Cloudflare keeps it private for free).
5. Enter your **payment details** and click **Complete Purchase**.

## Step 5 — Confirm and you're done
1. You may get one more **email asking you to verify your contact address** —
   this is an official requirement (ICANN). Click the link to confirm, or the
   domain can get suspended later. Do it now so you don't forget.
2. That's it — **you own the name.** You don't need to point it at anything yet.
   It simply waits until your OPEN site is ready to publish.

---

## What NOT to worry about right now
- **You don't need to set up a website, DNS records, or "nameservers" today.**
  When your OPEN site is ready on Netlify (the publish step from the Foundations
  guide), you'll connect this domain then — and Claude Code or Netlify walks you
  through it.
- **You don't need paid email yet.** A free Gmail is fine to start. If you later
  want a professional `you@yourdomain.com`, Cloudflare has free **Email Routing**
  that forwards mail from your domain to your Gmail — a nice upgrade for another
  day.
- **Skip any add-ons** offered at checkout beyond the domain itself. You don't
  need them.

## One thing to know about Cloudflare specifically
Domains bought here **use Cloudflare's nameservers** and can't be moved to a
different DNS provider while registered with Cloudflare. For your project that's
a non-issue — it's actually simpler, since Cloudflare handles the technical side
and connects cleanly to Netlify when you publish. Just worth knowing.

## Where to find it again later
Dashboard → **Domain Registration** → **Manage Domains**. From there you can turn
auto-renew on/off, add more years, or update your contact info.

---

### Your next steps after this
1. Domain bought (this guide). ✔
2. Generate your Privacy Policy + Terms pages (Foundations guide, Part 2).
3. Run the Supabase setup (Foundations guide, Part 3).
4. Have Claude Code wire it together, publish on Netlify, and connect this
   domain.

Owning the name is the foundation everything else sits on — nice work getting it
locked in early.
