# EventPro OS

Management app for tent houses, caterers and event managers: bookings, godown stock, catering ration, GST invoices, payments, vendors, staff, live setup tracker, reports, client portal, and a Super Admin console for the platform owner.

- **Live app:** https://eventpro-os.vercel.app
- **Database:** Supabase project `eventpro` (Mumbai, `uregwtavhkjowiltukiq`)
- **Hosting:** Vercel, auto-deploys every push to `main`

## Who logs in, and how

| Person | How they get a login | Forgot password |
|---|---|---|
| **Super Admin** (platform owner) | Created in the database. Can make other Super Admins from *Super Admin → Users*. | Another Super Admin resets it, or reset in Supabase. |
| **Business owner** | Signs up on the login screen (*New business*, free trial), or the Super Admin creates the business from *Super Admin → Add business*. | Must contact the Super Admin. Only the Super Admin can reset an owner's password. |
| **Employee** (manager, accountant, supervisor, crew) | The owner creates their login ID (mobile number or email) and password in *Team & Access → Add employee*. | The owner sets a new password from *Team & Access → Access*. |
| **Client** | No login. Opens a link or code for their one event. | — |

Login ID can be an email or a 10-digit mobile number. Accounts are created already-confirmed, so no verification email is needed.

**Authenticator (2-step login):** anyone can turn it on from the account menu → *Authenticator* (Google Authenticator / Microsoft Authenticator, scan QR, enter code). After that every login asks for the 6-digit code. The database itself refuses all data until the code is entered, so a stolen password alone is not enough. Lost phone: the owner (for employees) or Super Admin (for anyone) uses *Reset authenticator*.

## Access control

- Every section has 4 levels: No access, View, Edit, Full (Full can also delete).
- Default roles: Owner, Manager, Accountant, Site Supervisor, Crew. Owners can create custom roles.
- Owners can give one person different access from their role (*Team & Access → Access*).
- **Plans:** Super Admin sets plan, validity date, and can suspend a business. After expiry the business becomes read-only; suspended businesses cannot open the app.
- All of this is enforced in the database (Row Level Security and checked SQL functions), not only hidden in the app.

## Super Admin console

Businesses (plan, expiry, team size, bookings, last activity, notes) · Add business with owner login · Open any business · Plan & access (extend, suspend) · Users (reset password, block/unblock login, make Super Admin) · Plans & support (platform name, support WhatsApp, trial days, plan prices, allow self sign-up on/off).

## Files

| Path | What it is |
|---|---|
| `index.html` | The built app (single file, served by Vercel). |
| `src/` | Source: `core.js` (data + auth), `auth.js` (login, client portal), `views-*.js` (screens), `app.css`, `head.html` (config). |
| `build.py` | Builds `dist/index.html` from `src/`. Copy it to the repo root before pushing. |
| `supabase/schema.sql` | Tables, Row Level Security, permission and business functions. |
| `supabase/auth_admin.sql` | Login management: sign-up, employee logins, password resets, block, Super Admin. |

## Changing the app

```bash
python3 build.py          # builds dist/index.html
cp dist/index.html .      # Vercel serves the root index.html
git commit -am "..." && git push
```

## Notes

- The Supabase anon key in `src/head.html` is public by design; data access is controlled by the database rules.
- Recommended in Supabase → Authentication: turn on *Leaked password protection*.
