# SabManage — handover notes for Claude / developers

Read this first. It is the full context of the project as of 17 Oct 2026, so a new session can continue without the original chat.

## What it is
SabManage (earlier name: EventPro OS) is a multi-tenant SaaS for Indian businesses. Two kinds today (`orgs.kind`): **event** = tent houses, caterers/halwais, decorators and event managers, and **clinic** = doctors / clinics (see 'Clinics' below). Event businesses get: bookings, godown stock with date-wise availability, catering ration calculator, GST invoices/quotations/challans/receipts with the business's own logo, payments and WhatsApp reminders, vendors and POs, crew attendance and wages, live setup tracker, reports/P&L, reviews, a client (guest) page, and per-person access control.

- Owner of the platform (Super Admin): **Chirag Sharma** — login `chiragsharma98873@gmail.com`, support WhatsApp 9950653247. He communicates in **Hinglish**; reply in Hinglish, keep UI copy in plain English with the Hindi dictionary (Hindi side fully in Devanagari).
- Live: website https://sabmanage.com · app https://sabmanage.com/app · old https://eventpro-os.vercel.app redirects here.
- Repo: https://github.com/Chiragcv01/Eventpro (branch `main`; currently public — owner was advised to make it private).

## Stack and hosting
| Piece | Where | Notes |
|---|---|---|
| App | `app.html` built from `src/` by `python3 build.py` | Single-file vanilla JS SPA, no framework, no npm for the app |
| Website/blog | `api/site.js` (Vercel Node function) + `site.css`, `site.js`, `img/` | Server-rendered for SEO/WhatsApp previews, cached `s-maxage=60` |
| Hosting | Vercel project `eventpro-os` (id `prj_rfaKxq9TGcMSEQOVuiBqZTrZapWM`, team `team_Bqpb2KJqrwCkxsphCKF7Rcx8`), Hobby plan, functions region `bom1` | Git-linked: every push to `main` deploys (~30 s) |
| Database/auth/storage | Supabase project `uregwtavhkjowiltukiq` (Mumbai), org "Chiragcv01's Org", **Free plan** | URL + public anon key are in `src/head.html` and `api/site.js` (public by design; RLS protects data) |
| Domain | `sabmanage.com` on **Hostinger** (DNS: A @ → 216.198.79.1, 64.29.17.1; CNAME www → Vercel). www redirects to apex |
| Android | Trusted Web Activity, package `com.sabmanage.app`, v1.3.0 (code 4, notifications on, new icon, app name 'SabManage'), minSdk 24, targetSdk 36 | Built by GitHub Actions (unsigned) → signed by owner with upload key |

## Repo layout
```
src/head.html        config (Supabase URL/key), fonts, title
src/i18n.js          Hindi engine (MutationObserver translator) + dictionary "English | हिंदी"
src/core.js          utils, icons, constants, LocalDB + CloudDB adapters, state S, actions A, permissions, shell, alerts, business logic
src/help.js          ⓘ help texts (HELP map, English + Hindi) + info()/tabHelp()/A.help sheet
src/auth.js          login/sign-up (Terms checkbox), forgot password, guest (client) portal, Authenticator (TOTP)
src/views-ops.js     dashboard, bookings, event page, inventory, catering
src/views-money.js   invoices, payments, vendors, staff, live tracker, expenses, reports, reviews, tools, team, settings
src/views-admin.js   bill branding, plan card, blocked screen, Super Admin console (businesses, users, plans), employee logins
src/views-site.js    Super Admin: Website content, Blog editor (+cleanHTML sanitizer), Enquiries, Account deletion; user "Delete my account"
src/views-import.js  Excel/CSV import (SheetJS from jsDelivr, lazy) + "Get started" card
src/clinic.js        Clinic kind: clinic home, Patients (readings + SVG charts, records/visits + prescription print, messages with photo/voice, patient link), Appointments (clinic / Jitsi video / WhatsApp, fees, UPI, reminders), clinic settings, and the patient portal (#p-<token>)
src/clinic-text.js   ⓘ help + Hindi dictionary for the clinic screens (built last)
src/simple.js        Easy home (default; `A.setFull` toggles full), crew home (I reached / my work % buttons), quick booking + packages, simple access sheet, live sync (Realtime on `records`)
src/alerts.js        Team alerts: send/receive, full-screen ringing card, tune (`/sounds/alert.mp3`), Realtime, web push subscribe (VAPID public key here)
src/views-marketing.js  Marketing module: follow-ups, Google review requests, rate card (print/PDF), clients (CSV export, anniversaries, muhurat campaign), QR poster (qrcode-generator from jsDelivr, lazy), refer & share
src/app.css          app design (clean white, colourful; Baloo 2 + Mukta fonts)
build.py             concatenates src → app.html (order: i18n, core, alerts, help, auth, views-ops, views-money, views-admin, views-site, views-import, views-marketing, simple, clinic, clinic-text)
api/site.js          website: home (industry-neutral: bilingual headline, 'today' panel, pillars, business types), /events (tent/catering/event page), /doctors (clinic page), /blog, /blog/:slug, /privacy, /terms, /delete-account, sitemap, robots, RSS; HTML allow-list sanitizer
site.css, site.js    website style; language switch, contact form, delete-request form (call Supabase RPCs directly)
sw.js, offline.html  service worker (offline screen; push → notification; no private data cached)
sounds/alert.mp3     the SabManage alert tune (same tune as android/sabmanage_alert.ogg)
manifest.webmanifest PWA manifest (start_url /app)
.well-known/assetlinks.json   Android Digital Asset Links (upload key SHA-256; add Play app-signing SHA-256 later)
android/             twa-manifest.json + generate.js (@bubblewrap/core) + patch.js (adds DelegationService.java + res/raw/sabmanage_alert.ogg); built by .github/workflows/android.yml → branch android-build
play-store/          LISTING.md (EN + HI text, Data safety answers), icon, feature graphic, 8 screenshots
supabase/            schema.sql, auth_admin.sql, website.sql, account_deletion.sql, subscriptions.sql, marketing.sql, alerts.sql, simple.sql (copies of what was applied); functions/send-alert, functions/daily-summary (edge functions, deployed)
vercel.json          rewrites (website routes → api/site), redirect old host, headers
img/                 site screenshots, og.jpg, icons
download/SabManage.apk  the signed Android app served at sabmanage.com/download/SabManage.apk (replace on every release); page /download (api/site.js downloadPage)
```

## Data model (Supabase, all tables have RLS)
- `orgs` (business: name, status trial/active/suspended, plan, expires_at, **price** special ₹/month, notes) — trigger `orgs_protect` lets only Super Admin/service_role change status/plan/expires_at/notes/price.
- `org_members` (org_id, user_id, role, display_name, email, perms override jsonb, staff_id), `org_roles` (role perms jsonb).
- `records` (org_id, collection, id, data jsonb) — ALL business data. Collections: events, inventory, dishes, mandi, invoices, counters, payments, vendors, pos, staff, attendance, advances, payouts, tasks, expenses, reviews, settings(main), activity.
- `invites`, `guest_links` (client page tokens), `platform_admins` (user_id, active), `platform_settings` (id=1, data jsonb: appName, supportName/Phone/Email, trialDays, **graceDays**, allowSignup, plans[{name,price,desc}], site{brandName, tagline, about, aboutHi, legalName, address, city, phone, whatsapp, email, hours, mapUrl, instagram, facebook, youtube, linkedin, showPricing}).
- `alerts` (org_id, from_user, from_name, to_user null=everyone, to_name, title, body, urgent, event_id, acks jsonb {uid:{at,name}}, created_at) — RLS: members see alerts for them/sent by them (tasks perm 3 sees all); insert needs tasks perm ≥ 2; acknowledge via RPC `ack_alert`. In the `supabase_realtime` publication. `push_subs` (endpoint, user_id, p256dh, auth) saved via RPC `save_push_sub`. VAPID private key lives in Supabase Vault (`vapid_private_key`), read only by service_role through `vapid_keys()`. Edge function `send-alert` (verify_jwt) is called by the sender's app after inserting an alert; it pushes to the recipients' devices and removes dead subscriptions.
- Clinics: `orgs.kind` ('event'|'clinic', set from sign-up bizTypes containing 'clinic'; only Super Admin can change). `org_verifications` (doctor reg no, council, qualification, files in private bucket `verify/<org>/…`, status pending/approved/rejected) — `perm_for()` returns 0 for a clinic until **approved** (Super Admin → 'Doctor verification' tab). Collections: patients, readings, pmsgs (patient⇄clinic messages), visits (module `medical`, hidden in menu), appts; readings/pmsgs/visits load per patient (`loadPatient`). `patient_links` (token per patient, revocable, consent_at). Portal RPCs (anon, token = key): `patient_view`, `patient_consent`, `patient_add_reading`, `patient_message`, `patient_book`, `patient_paid` — each checks `org_open()`, consent, throttles, and calls `_clinic_notify` → alert kind 'patient' + push via send-alert (x-cron-token). Private bucket `clinic`: `m/<org>/<patient>/…` medical files (module medical), `p/<token>/…` portal files (valid token or patients access). Copies in `supabase/clinic.sql`.
- `blog_posts` (slug, title, excerpt, content HTML, cover_url, tags, lang, status draft/published, seo_*, author, published_at), `contact_messages` (website enquiries), `account_deletions` (requests).
- Storage bucket `blog` (public read; Super Admin write).
- Key functions: `perm_for(user, org, module)` → 0–3 (Super Admin 3; suspended 0; **expired + graceDays → 0**); `perm()`, `my_role()`, `is_super_admin()` all require `mfa_ok()` (aal2 when user has a verified TOTP factor). RPCs: `public_signup`, `create_org`, `create_member`, `set_user_password`, `admin_create_business`, `admin_block_user`, `admin_set_super`, `admin_overview`, `admin_users`, `reset_user_mfa`, `guest_view`, `guest_review`, `submit_enquiry` (throttled), `request_account_deletion`, `request_account_deletion_web`. **`admin_delete_account` is written in `supabase/account_deletion.sql` but NOT applied yet** (needs owner approval because it deletes data).
- Mobile login IDs are stored as `<10 digits>@mobile.eventpro.app` (constant `MOBILE_DOMAIN`; keep it — existing users depend on it). Users are created directly in auth.users with bcrypt (no email confirmation).

## Behaviour rules worth knowing
- Permissions: levels 0 none, 1 view, 2 edit, 3 full(delete). Owner = 3 everywhere. `lvl()`/`can()`/`need()` in core.js mirror the DB.
- Subscription: plan validity ends → after `graceDays` the business is fully blocked (DB returns no data; UI shows `V.blocked` "Your plan has ended" with renew WhatsApp). Grace period shows a red banner. Super Admin can change plan/status/date, ± validity, special price, bulk change validity, edit up to 6 plans.
- Owners cannot reset their own password; only Super Admin. Owners reset employees' passwords.
- Hindi: `I18N` translates text nodes/placeholders via the dictionary; `.paper` (bills) and `[translate=no]` are never translated. `I18N.missing()` lists untranslated visible strings. **Hindi must be fully in Devanagari** (owner's rule: many users cannot read English letters). Words people say in English are written as spoken: बुकिंग, इनवॉइस, जीएसटी, पेमेंट, लॉगिन, स्टॉक. Only things a user must type exactly (ERASE), file names (.xlsx), URLs and sample codes stay Latin. Dates get Hindi month/day names (`dateHi`). Patterns: the most specific pattern wins.
- ⓘ help: `src/help.js` holds `HELP` (English + Hindi side by side, loaded into the dictionary). `pageHead()` adds the ⓘ for the current page (key = `S.view`); tabs use `tabHelp('key')`, cards/sections use `info('key')`. Add a HELP entry for every new page, tab or card.
- Crew pay: staff have `rate` (wage per duty), `dutyHours` (default 8), `otRate` (blank = rate ÷ dutyHours). Attendance `hours` > duty → `floor(hours/duty)` shifts + leftover hours as overtime (`attPay`). Money to crew lives in collection `advances` with `kind`: advance (cut from pay), food / travel (company cost), bonus (added to pay); old records without kind = advance. Net pay = wages + OT + bonus − advance. Costs everywhere (event profit, Reports, Expenses) = vendor POs + expenses + wages/OT + food/travel/bonus (`crewSpend`). The Expenses page lists crew and vendor lines read-only from Staff/POs (`monthCosts`), never stored twice.
- Marketing: module key `marketing` (manager default 2). Follow-up due = Enquiry/Quoted, not past, last touch (`followUpAt` or `created`) ≥ 2 days → also a dashboard alert. Settings keys `googleReview`, `instagram` (also returned by `guest_view`). Referral: `?ref=<first 8 chars of org id>` on sabmanage.com or /app is kept in localStorage `ep_ref` and saved as `settings.referredBy` at sign-up; `admin_overview` returns `referredBy`; reward text = platform `referralReward`.
- Alerts & sound: urgent alerts loop the tune (max 2 min) until "Seen"; new important reminders (Overdue/Shortage/Confirm/Return/Dispatch) play it once. In the Android app (v1.1+) `DelegationService.java` reposts every web notification on channel `sabmanage_team_alerts` with the tune on the ALARM stream (heard on silent/vibrate); urgent ones (title starts with 🚨) get FLAG_INSISTENT. Browsers / the website PWA follow the phone's normal notification sound rules (silent = no sound). Permission: Android 13+ never asks at install; the app shows `A.notifSheet()` once after login (`maybeAskPush`, 'Not now' = ask again in 3 days); account menu tile "Notifications on/off" opens it; it has a self-test (alert to self, edge function waits `delay` ≤ 20 s via EdgeRuntime.waitUntil).
- Easy mode: new default home per device (`ep_full_<org>` in localStorage = full). Owner/manager: today strip + 4–6 big buttons + today/tomorrow with live setup %. Crew (role staff, or linked staff without bookings edit): 'I have reached the site' → RPC `mark_my_attendance` (attendance with `selfAt`), my tasks with 25/50/75/Done; Done sends a quiet `kind:'update'` alert to `to_role:'managers'`. New bookings go through `A.newBooking()` (quick 4-field form in easy mode; packages from `settings.packages`, 'Save as package' on the booking overview). Adding a Crew login auto-creates/links a crew record. 'What they see' = `A.accessSheet` (Off/See/Change per section, saved as member perms override).
- Live sync: every save sets `updatedById`; Realtime on `records` updates other open phones within a second (toasts for crew progress, self attendance, new bookings, payments); the app also reloads data when it comes back to the screen after 90 s.
- Morning summary: pg_cron 02:15 UTC → edge function `daily-summary` (token in Vault `cron_token`) → push 'Today: N events…' to owners/managers in their app language (`push_subs.lang`). Android v1.2: only titles starting 🔔/🚨 use the alarm channel; ☀️/✅ use the normal channel.
- Blog HTML is sanitized on save (`cleanHTML` in views-site.js) and on render (`sanitize` in api/site.js).
- Offline mode: if `supabaseUrl` is empty the app uses LocalDB (localStorage) — used for local testing (`superAdminEmails` in config makes a Super Admin offline).

## Brand and website (17 Oct 2026 redesign)
- Owner's rule (repeated twice): the main website and the app's opening screen must NOT name any business type (no tent, catering, events, doctors, clinics, weddings) anywhere: hero, nav, FAQ, About, contact form, footer, structured data. The type is asked only at sign-up. /events and /doctors still exist for direct sharing but are unlinked, noindex and out of the sitemap. Blog is only in the footer (posts are wedding-related); the home page has no blog section.
- Owner's rule: the WEBSITE is English only, in professional English: no Hindi line, no language switch (`hi()` in api/site.js returns '' and site.js ignores the old ep_lang choice), no Hinglish words (no 'hisaab', 'taqaza', 'ji'). The APP stays bilingual; its English mode uses 'Remind' (Hindi तकाज़ा) and 'Run your entire business from one app.' on the login screen.
- Home sections: hero ('Run your entire business from one app.' + 'Today' panel), pillars, 'A closer look at the app' (img/shot-bill.webp, shot-payments.webp, shot-staff.webp from a neutral demo business 'Sharma Enterprises'), small helps, steps, pricing, about, FAQ, contact.
- Mark = three rounded tiles + a tick (`icon.svg`, `MARK` in api/site.js, `MARK_SVG` in core.js, PNGs in img/icons, play-store/app-icon-512.png). og.jpg and the Play feature graphic use the same 'Today' panel design.
- Website fonts: Anek Devanagari (headings, font-stretch ~84–92%) + Mukta (text). Palette: ink #0E1A33, blue #1F5EFF, green #0B9B68, mist #F4F6FA. The festive canopy/bunting is removed (`.canopy` hidden). Bump `V` in api/site.js when site.css/site.js change.

## Clinics (doctors) — behaviour
- Sign-up: 'What is your business?' cards (tent / caterer / event = multi; Doctor / Clinic = exclusive) → doctor fields (reg no, council, qualification, speciality, certificate upload) → clinic shows `V.verify` until approved. `/app#signup-clinic` preselects Doctor. Roles: Doctor (Owner), Associate doctor, Receptionist (no medical records), Nurse / Assistant (`CLINIC_ROLES`).
- Patient link: doctor sends `sabmanage.com/app#p-<token>` on WhatsApp; patient agrees once, then sends readings (server validates ranges; very high/low values notify the clinic), messages with photo/PDF/voice (MediaRecorder, max 2 min), books appointments (requested → doctor confirms), pays by UPI deep link/QR and taps 'I have paid' (doctor confirms). Video calls = Jitsi Meet room per appointment; WhatsApp call = opens chat.
- `shrinkPhoto` (auth.js) resizes photos; do NOT name it `shrinkImage` (views-site.js has a different `shrinkImage` and the later one wins).
- Offline tests of the portal must use ONE tab (two tabs overwrite the shared localStorage DB).

## How to work on it
1. Edit `src/*`, run `python3 build.py` (writes `app.html`; also `dist/`, `app.js`, `artifact.html` which are git-ignored).
2. Test offline: copy app.html, blank the Supabase URL/key in `window.EVENTPRO_CONFIG`, open with Playwright/Chromium.
3. Add Hindi lines to `src/i18n.js` for any new UI text.
4. DB changes: apply as a Supabase migration (non-destructive SQL applies directly; SQL containing delete/drop needs the owner's approval) and save a copy in `supabase/`.
5. Commit with a clear message and push to `main` → live.
6. Android: bump `appVersionCode` in `android/twa-manifest.json`, push → Actions builds unsigned files to branch `android-build` → sign with the owner's upload key (`jarsigner` for .aab, `apksigner.jar` for .apk). Key file `sabmanage-upload.jks`, alias `upload`, SHA-256 `5B:C1:89:CA:AB:4B:92:11:71:AB:35:49:AF:39:E7:31:CF:12:E1:1F:9A:C9:4B:DB:14:B2:8F:5D:9B:3B:62:3F`. The key and its password are only with the owner — never commit them.

## Status (17 Oct 2026)
Done: full app; Android app download page + 'What's new' card + 'Send app to team'; easy mode + crew screen + quick booking/packages + simple access + live sync + morning summary; team alerts with ringing tune + web push + Android alarm-channel notifications (v1.1.0); ⓘ help on every page/tab/card; crew duty hours/overtime/extra shifts + crew money (advance/food/travel/bonus) flowing into Expenses and P&L; Marketing module (follow-ups, Google reviews, rate card, clients export, anniversaries, muhurat campaign, QR poster, refer & share); Hindi fully in Devanagari; roles/permissions; Super Admin console (businesses, users, plans & support, website, blog, enquiries, account deletion); Authenticator; Hindi; website + blog + legal pages + SEO; contact form; Excel import (stock, menu, crew, vendors, bookings); Get-started card; Terms consent at sign-up + in-app re-acceptance for owners when `TERMS_VERSION` (src/core.js, currently 2026-10-17) changes — bump it whenever the Terms/Privacy text changes materially; full Terms (19 sections) and Privacy (DPDP Act 2023: business = Data Fiduciary, SabManage = Processor; subprocessors; 90-day retention after expiry) with Hindi summary box in api/site.js `legalPage`; subscription controls and blocking; account deletion requests (app + web); PWA + offline screen; Android .aab/.apk v1.0.0 signed; Play Store listing kit; domain sabmanage.com; rebrand to SabManage. Database is clean (only the Super Admin user, 0 businesses).

Pending (owner): enable Authenticator on Super Admin; change Super Admin password; make repo private; run `supabase/account_deletion.sql`; Play Console account + closed test (12 testers × 14 days) + listing; send Play **app signing** SHA-256 to add to `assetlinks.json`; fill website address/legal name; get Terms/Privacy reviewed; buy Supabase Pro + Vercel Pro before first paying customer.

Clinic version (17 Oct 2026): done and tested (DB functions end-to-end in a rolled-back transaction; UI flow offline). Website repositioned for all businesses + /doctors page; Terms §8 'Doctors, clinics and patients' and Privacy health-data clauses; TERMS_VERSION 2026-10-17.2 (owners re-accept). Play Console needs a Health apps declaration + updated Data safety before a clinic build is published.

Mini-website per business (owner wants `businessname.sabmanage.com`, name first): NOT built yet, owner said it is not needed now. Plan when asked: wildcard subdomain `*.sabmanage.com` on Vercel (needs nameservers moved from Hostinger to Vercel, free), `api/site.js` renders a public page from the business's settings + rate card, enquiry form → new Enquiry booking via a throttled RPC. No extra cost on current plans.

Next features (agreed order): Razorpay online renewal (needs owner's Razorpay KYC) → stronger password rule (8 chars + number) → GSTR-1/Tally export → automatic WhatsApp reminders (WhatsApp Business API) → offline crew updates → lead/error alerts → iPhone app, multi-branch, client CRM.
