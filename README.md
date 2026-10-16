# SabManage

Management app for tent houses, caterers and event managers: bookings, godown stock, catering ration, GST invoices, payments, vendors, staff, live setup tracker, reports, client portal, and a Super Admin console for the platform owner.

- **Website:** https://sabmanage.com (home, About, Contact, pricing, FAQ, blog)
- **App:** https://sabmanage.com/app
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

## Hindi / English

Everyone can switch the app between Hindi and English (the **हिं | EN** switch on the login screen, the top bar and the client page; also in the account menu). Everyday words people say in English (Booking, Invoice, GST, Payment, Login…) stay in English. Bills, challans and receipts always print in English. All translations live in `src/i18n.js` (one `English | हिंदी` line each).

## Website and blog

- `/` home page with features, pricing (from *Plans & support*), About us, FAQ and a contact form. `/blog`, `/blog/<post>`, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt` and `/blog/rss.xml`.
- Pages are rendered by `api/site.js` (a Vercel function) so Google and WhatsApp previews see the real text. Edits show within about a minute.
- **Super Admin → Website:** brand name, headline, About us (English and Hindi), phone, WhatsApp, email, address, hours, map and social links, show/hide prices.
- **Super Admin → Blog:** write posts with headings, lists, quotes, links and pictures, cover image, tags, language, Google title/description. Save as draft or publish.
- **Super Admin → Enquiries:** every contact-form request, with Call and WhatsApp buttons and a status (New / Contacted / Closed).

## Android app (Google Play)

Package `com.sabmanage.app`. The app is this same web app inside a Trusted Web Activity, so website updates reach the app without a new Play release.
- `android/twa-manifest.json` describes the app. Pushing a change there runs `.github/workflows/android.yml`, which builds an **unsigned** `.aab`/`.apk` onto the `android-build` branch.
- The owner signs it with the private upload key (`jarsigner` for the `.aab`, `apksigner.jar` from that branch for the `.apk`). The key never goes to GitHub.
- For a new version, raise `appVersionCode` (and `appVersionName`) in `android/twa-manifest.json`.
- `/.well-known/assetlinks.json` lists the upload key fingerprint. After the first Play upload, add the **App signing key** SHA-256 from Play Console → App integrity, or the Play-installed app shows a browser bar.
- `play-store/` holds the listing text (English and Hindi), icon, feature graphic, screenshots and Data safety answers.
- Run `supabase/account_deletion.sql` once in Supabase so Super Admin can erase accounts.

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
| `app.html` | The built app (single file), served at `/app`. |
| `api/site.js`, `site.css`, `site.js`, `img/` | The public website and blog. |
| `src/` | Source: `core.js` (data + auth), `auth.js` (login, client portal), `views-*.js` (screens), `app.css`, `head.html` (config). |
| `build.py` | Builds `app.html` from `src/`. |
| `supabase/schema.sql` | Tables, Row Level Security, permission and business functions. |
| `supabase/auth_admin.sql` | Login management: sign-up, employee logins, password resets, block, Super Admin. |
| `supabase/website.sql` | Blog posts, website enquiries and the image bucket. |
| `src/i18n.js` | Hindi translations. |

## Changing the app

```bash
python3 build.py          # builds app.html (served at /app)
git commit -am "..." && git push
```

## Notes

- The Supabase anon key in `src/head.html` is public by design; data access is controlled by the database rules.
- Recommended in Supabase → Authentication: turn on *Leaked password protection*.
