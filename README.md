# SafetyCheck Inc. — Client Training Portal

Static, phone-first safety-training deliverables hosted on Netlify. All video,
audio, and imagery live on Cloudinary — this repo holds only the HTML/CSS/JS
and the Netlify config. Each client lives in its own folder.

```
/martam/            First client — Martam Construction
  index.html        Interactive training page (video + chapters + quizzes)
  status.html       Internal build log / project status
  vo-script.html    Internal teleprompter VO script
/partner/           Orbis × SafetyCheck program pitch kit (separate password)
  partnership-budget.html            Budget & partnership model (hub)
  safetycheck-training-landing.html  Customer-facing sales landing page
  safetycheck-training-library.html  First-year training library package
  safetycheck-estimate-martam.html   Sample single-course estimate
  safetycheck-estimate-library.html  Sample library batch estimate
  index.html                         Redirects to the budget hub
netlify/
  edge-functions/
    gate.ts         Password gate for /martam/*  (reads SITE_PASSWORD)
    gate-partner.ts Password gate for /partner/* (reads PARTNER_PASSWORD)
netlify.toml        Build + edge-function config
```

## Access control

The Martam area is password-protected by a **Netlify Edge Function** that reads
the **`SITE_PASSWORD`** environment variable. Password only — there is no
username. The password is **never stored in this repo**; only a hash of it is
placed in an HttpOnly cookie after a correct entry.

### One-time Netlify setup

1. Connect this GitHub repo to a Netlify site (build command: none; publish
   directory: `.` — already set in `netlify.toml`).
2. **Site settings → Environment variables → Add a variable**
   - Key: `SITE_PASSWORD`
   - Value: *your chosen password*
3. Trigger a deploy. Visiting `/martam/` now shows a branded password screen
   until the correct password is entered. (Until the variable is set, the area
   shows an "Access is not configured yet" screen.)

There is also a discreet **admin badge** (small "A", bottom-right) on the
training page that opens a slide-in panel linking the internal docs
(Status / VO Script). Those docs are protected by the same edge gate.

### Partner / pitch kit — a second, independent gate

The `/partner/` area (the Orbis × SafetyCheck program kit — budget model,
landing page, library, estimates) has its **own** edge function,
`gate-partner.ts`, protecting `/partner/*`. It works exactly like the Martam
gate but reads a **separate `PARTNER_PASSWORD`** environment variable and uses
its own `partner_gate` cookie — so the partner area can have a **different
password** from the client training, and the two never share a session.

To activate it, add a second Netlify environment variable the same way:

- **Site settings → Environment variables → Add a variable**
  - Key: `PARTNER_PASSWORD`
  - Value: *the partner-kit password*
- Trigger a deploy. `/partner/` then shows a "Partner Preview" password screen.

As with `SITE_PASSWORD`, the password value is **never stored in this repo**
(this repo is public). The actual passwords are kept in Netlify's env vars and
in the owner's private notes — not here.

## Going live (make the training public, keep internal docs protected)

When the training is approved for public release, edit `netlify.toml`: comment
out the "WHILE IN REVIEW" edge-function block and uncomment the "Going live"
block, which gates everything **except** the training page:

```toml
[[edge_functions]]
  path = "/martam/*"
  function = "gate"
  excludedPath = ["/martam/", "/martam/index.html"]
```

Commit and push — `index.html` (the training page) becomes public while
`status.html` and `vo-script.html` stay behind the password.
