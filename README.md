# School Website + Portal

A public website for one school, with a sign-in **portal** for the head teacher, faculty and students.

- **Public website:** Home, About, Academics, Facilities, Faculty, Gallery, Notices, Admissions (with enquiry form), Contact, Privacy Policy and Terms. English and Bengali.
- **Head teacher:** edits every page's text and photos, chooses which pages are shown, creates accounts for teachers and students, resets passwords, approves teachers' posts and sees an activity log.
- **Faculty:** edit their own Faculty-page profile and photo, and post notices and gallery photos. Posts can require the head teacher's approval.
- **Students:** see their own exam results and read notices marked *students only*.
- **Student records, marksheets and ID cards** (head teacher only): class, roll no., PEN, Aadhaar, parents and photo for every student; marks typed in on screen; marksheets and ID cards made automatically and printed on A4.
- **Check result** (public page, `/results/`): families enter the student ID (the ID card number) and date of birth to see and print published marksheets. No sign-in needed.

There are no payment, attendance or fee features.

---

## 1. How it is built

| Part | Technology |
| --- | --- |
| Website and portal | React + TypeScript (Vite). Public pages are rendered on the server for search engines. |
| Server | Node.js 20+ with Express |
| Database | PostgreSQL: accounts, website content, notices, gallery and uploaded photos |
| Sessions | Redis: sign-in sessions and login-attempt limits |
| Hosting | [Railway](https://railway.com): one web service + Postgres + Redis |

Uploaded photos are resized (max 2000 px), converted to WebP, and stripped of hidden data such as GPS location. They are stored in Postgres, so a database backup includes every photo.

## 2. Deploy on Railway

1. Push this folder to a GitHub repository.
2. In Railway: **New project → Deploy from GitHub repo**, and choose the repository. This creates the web service.
3. In the same project, add **Database → PostgreSQL** and **Database → Redis**.
4. Open the web service → **Variables** and add:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
   | `SESSION_SECRET` | a random string of 32+ characters (e.g. from a password manager) |
   | `HEAD_TEACHER_USERNAME` | e.g. `headteacher` |
   | `HEAD_TEACHER_PASSWORD` | a temporary password, at least 10 characters |
   | `NODE_ENV` | `production` |

5. Deploy. [`railway.json`](railway.json) already sets the build command (`npm run build`), start command (`npm start`) and health check (`/healthz`). On first start, the server creates the database tables, copies in the starter content and creates the head-teacher account.
6. Under **Settings → Networking**, click **Generate domain**, or add your own domain (see section 6).
7. Open `https://<your-domain>/portal/login` and sign in with the head-teacher username and password. You will be asked to choose a new password straight away.

After the first sign-in you may delete `HEAD_TEACHER_PASSWORD`. It is only used when **no** active head-teacher account exists (for example, to recover access).

**Run one web instance (one replica).** Content changes show up immediately on that instance. With several replicas, other instances can show old content for up to 30 seconds.

## 3. Using the portal

There are two sign-in pages, both linked from the footer of the public site:

- **Staff and head teacher:** **/portal/login**, with username and password.
- **Students:** **/portal/student-login**, with student ID and date of birth. There is no password to remember. After 5 wrong attempts, that student ID is locked for an hour.

**Be aware:** results are unlocked with the student ID and date of birth only. A classmate who knows another student’s ID and birthday could see that student’s marks. The 5-attempt lockout stops guessing, but not someone who already knows both details. If that matters for your school, ask a developer to add a secret result PIN.

**Head teacher**
- **Website content**: every text and photo, grouped by page. Use *Pages & approval* to hide pages, or to choose whether teachers' posts need approval. Text in `[square brackets]` is a placeholder, and the dashboard counts how many are left.
- **Accounts**:
  - *Add staff*: the portal shows a temporary password **once**; give it to the person, and they must change it at first sign-in. Use *Reset password* when someone forgets theirs, or *Set password* to type a new password for them yourself. Your own password: *My account*.
  - *Add student*: enter the name, student ID and date of birth. Use *Edit* to correct them; changing either signs the student out.
  - Disabling an account signs that person out at once.
- **Faculty profiles**: who appears on the Faculty page. Link a profile to a teacher's account so they can update it themselves.
- **Notices / Gallery**: approve or hide anyone's posts, and edit or delete them.
- **Photos & files**: everything uploaded. Files still in use cannot be deleted.
- **Activity log**: sign-ins and every change, with who made it.

**Faculty:** *My profile*, *Notices* and *Gallery*. They can change or delete only their own posts.

**Students:** sign in with student ID and date of birth. *My results* shows their own published results (marks, total, percentage, grade, remarks) and has a *Print* button. *Notices* shows public notices plus those marked *students only*. Staff-only notices are never shown to students.

**Students (head teacher)**
- *Students → Add student*: name, student ID, date of birth, class, section, roll no., admission no., gender, blood group, PEN, Aadhaar, father's and mother's names, guardian's phone, address and a passport-size photo.
- The **student ID is the ID card number**. Families use it with the date of birth to check results.
- The Aadhaar number is checked as you type, which catches most typing mistakes. Only the head teacher ever sees the full number. Marksheets show `XXXX XXXX 1234`, as UIDAI recommends. When printing marksheets you can choose to print the full number; that choice is recorded in the activity log.
- **Many students at once:** open *Add or update many students from a spreadsheet*, download the template (or the current list), fill it in and upload it as CSV. Students with an existing student ID are updated; new ones are added. Only the columns in the file are changed. Dates can be DD/MM/YYYY. **In Excel, format the Aadhaar and PEN columns as Text first.** Otherwise Excel turns 12-digit numbers into `2.34E+11`; the upload notices this and says so.

**ID cards (head teacher)**
- *ID cards*: choose a class (and section), then *Print*. Cards are real size (54 × 85.6 mm), 9 per A4 sheet, with dashed cutting lines. A single student's card: *Students → ID card*.
- Each card shows the school name, logo, address and phone, session, photo, name, class, section, roll no., student ID, date of birth, blood group, parents, phone and address.
- In the print window choose **Scale 100% / Actual size** and turn on **Background graphics**.

**Results and marksheets (head teacher)**
1. *Results & marksheets → New exam*: exam name, class (e.g. LKG, UKG, 5; the marks sheet then lists only that class), session, and the subjects with full marks and (optional) pass marks. *Copy the setup of an earlier exam* fills all of this in from another exam.
   - **Mark parts** (optional): split marks into parts such as *Term 1*, *Term 2* and *Viva*. Each subject gets its own full and pass marks per part. Leave a part empty for subjects without it (e.g. no Viva in Maths). A subject's total is its parts added up, and the marksheet shows each part.
   - **Graded-only subjects**: leave full marks empty (e.g. Drawing) and type the grade itself (A+) as the mark. They are not added to the total.
   - **Passing**: a student is *Not passed* if any part or subject is below its pass marks, or (optional) below the exam's overall pass percentage. Absent counts as below.
   - **Grades**: use the school's grade scale, or give the exam its own (presets: A++ to D, A+ to E, Pre-primary). Tick *Print a grade for each subject* to grade every subject as well as the overall result.
2. *Enter marks*: a grid with one row per student. Type numbers, or a code such as `AB` for absent. Enter moves down, like a spreadsheet. Marks above the full marks are shown in red and cannot be saved. Totals and percentages update as you type. Leave *Grade* empty to calculate it from the grade scale. With mark parts, each part has its own column. Marks can be corrected at any time, even after publishing; families see the change straight away.
   - Prefer a spreadsheet? *More → Download spreadsheet* (one column per subject, or per part, e.g. *English - Term 1*), fill it in, then *More → Upload marks (CSV)*. The whole file is checked first; if any row has a problem, nothing is saved and every problem is listed.
3. *Marksheets*: one A4 page per student, made automatically. Each shows the school letterhead (name, logo, affiliation, UDISE code, address, phone), the student's details (including PEN and the masked Aadhaar), marks, total, percentage, grade, Passed / Not passed, remarks and signature lines. Print them all, one section, or one student.
4. *Publish*: only now can families see the marksheet on the **Check result** page, and students in the portal. *Unpublish* hides them again.

The UDISE code, session, the school's grade scale, signature titles and the notes printed on marksheets and ID cards are set under *Website content → Marksheet & ID card*.

**Check result (families)**: the **Check result** button sits at the top of every page, and the page is at `/results/`. Families enter the student ID and date of birth and can print or save the marksheet as PDF. After 10 wrong attempts for one student ID, that ID is locked for an hour.

Notice audiences: **Everyone** appears on the public website; **Students only** and **Staff only** are visible only in the portal. Attachments on non-public notices are not listed anywhere public, but anyone who is sent the link can open them. Don't attach confidential documents.

## 4. Run it on your computer

Requirements: Node.js 20.9+.

```bash
npm install
npm run dev
```

- Website: http://localhost:5173 (or the next free port Vite reports). Portal: `/portal/login`.
- First sign-in: username `headteacher`, password `change-me-please`. You'll be asked to change it.
- With no `DATABASE_URL` set, a local Postgres-compatible database ([PGlite](https://pglite.dev)) starts automatically and keeps its data in `.local-db/`. Delete that folder to start over.
- Redis is optional locally. Without `REDIS_URL`, sessions are kept in memory and you are signed out whenever the server restarts.
- The API server runs on port 3100. Set `PORT` to change it.
- Always start with `npm run dev`, not `vite` on its own: Vite serves only the pages, and the content, sign-in and photos come from the API. If you already have Vite running, start the rest with `npm run api`. Without the API, the site shows starter content with a notice, and the portal does not work.

To try the production build locally:

```bash
npm run build
npm run start:local     # http://localhost:4000
```

You can put local settings in a `.env` file; see [`.env.example`](.env.example).

## 5. Starter content

[`src/config/school.config.ts`](src/config/school.config.ts) holds the content copied into the database **the first time** the site starts. After that, all editing happens in the portal, and changing the file has no effect on a running site. Everything in `[square brackets]` is a placeholder. Publish only information the school has confirmed.

Menu and button wording, in both languages, is in [`src/i18n/strings.ts`](src/i18n/strings.ts). The Privacy Policy and Terms text is in [`src/content/legal.ts`](src/content/legal.ts). It describes the accounts and the sign-in cookie. **Have the school review both pages, and have a fluent reader check the Bengali text, before going live.**

## 6. Custom domain

1. In Railway: web service → **Settings → Networking → Custom domain**. Enter e.g. `www.yourschool.edu.in` and create the DNS record Railway shows at your domain registrar.
2. In the portal: **Website content → School & branding → Website address**, enter `https://www.yourschool.edu.in`. This enables canonical links, social previews and `/sitemap.xml`.
3. Optionally, submit `https://www.yourschool.edu.in/sitemap.xml` in Google Search Console.

## 7. Admission enquiry form

The public form never creates accounts or stores enquiries in the database. Set **Website content → Admissions → Form service address** to a form service, such as [Formspree](https://formspree.io) or [Web3Forms](https://web3forms.com) (for Web3Forms, add `access_key` under *Extra form-service fields*). "Sent" is only shown after the service confirms delivery. With no service set, parents' email or WhatsApp app opens with the enquiry pre-filled, and the page clearly says it hasn't been sent yet.

## 8. Many visitors at once (result day)

Nothing can promise "zero chance" of failure: hosting, internet links and databases can all have problems. This site is built so that heavy traffic slows it down a little rather than crashing it:

- **Pages are rendered once and reused**, not rebuilt for every visitor. Website content is read from the database at most once every 30 seconds, and only one read happens at a time. If the database is briefly unreachable, the last saved copy keeps the public site up.
- **Results are cached for a minute** per student. Thousands of families refreshing the result page cause very little database work. Any change to marks or publishing clears the cache immediately.
- **Load shedding**: if more than `MAX_IN_FLIGHT` requests (default 4000) are being handled at once, new ones immediately get "very busy, try again in a few seconds" instead of piling up until the server runs out of memory. If the database is too busy, visitors get the same friendly message after 10 seconds, not an endless wait.
- Pages are **gzip-compressed** (faster on mobile data). Scripts and styles are cached by browsers for a year.
- A dropped database connection is logged, not fatal. If something truly unexpected happens, the server exits and Railway restarts it automatically (`restartPolicyType: ALWAYS`).

Measured on a laptop with the production build: 10,000 requests from 1,000 simultaneous visitors and 20,000 requests from 3,000 simultaneous visitors were all answered successfully (median 0.5 s and 1.2 s), and the server stayed healthy throughout. A Railway server is usually faster than that test. This was not a test against Railway's own Postgres.

For an exceptionally busy result day:
- In Railway, give the web service more CPU/RAM. You can also raise **Replicas** to 2 or more (sessions and sign-in limits are shared in Redis). With several replicas, a change can take up to 30 seconds (content) or 60 seconds (results) to appear on every replica.
- Optionally put the domain behind **Cloudflare** (free plan) for extra protection against traffic floods.
- Settings: `PG_POOL_MAX` (database connections per server, default 20; keep the total under your Postgres connection limit) and `MAX_IN_FLIGHT` (default 4000).

## 9. Security

- Passwords are stored only as bcrypt hashes. Temporary passwords must be changed at first sign-in, and new passwords need at least 10 characters.
- Sessions use an HttpOnly, SameSite cookie (Secure in production) and expire after 8 hours without activity. Changing a password, resetting one, disabling an account or changing its role signs that user out everywhere.
- Sign-in is limited to 10 attempts per username per 15 minutes. Wrong usernames and wrong passwords give the same message.
- Requests that change data must come from the site itself (cross-site protection), and every input is validated on the server. Links must be `https://`, so `javascript:` links are rejected. SVG uploads are refused.
- Security headers come from Helmet, including a Content Security Policy.
- At least one active head-teacher account must always exist, and head teachers cannot disable or delete themselves.
- **Back up the Postgres database** regularly (Railway → Postgres → Backups). It holds all content, accounts and photos.

## 10. Project structure

```
server/                 Express server (API, sign-in, server rendering)
  migrations/           database tables (applied automatically on start)
  routes/               auth, users, students, results (exams/marksheets/result lookup), content, media
  schema.ts             validation for everything the portal can save
src/
  pages/, components/   public website (ResultCheck.tsx, Marksheet.tsx)
  lib/marksheet.ts      totals, grades, pass/fail and Aadhaar checks (shared by server and browser)
  styles/documents.css  marksheet and ID-card layout (screen and print)
  portal/               staff & student portal (loaded only on /portal)
  config/               content types + starter content
  i18n/strings.ts       interface text (English / Bengali)
  content/legal.ts      Privacy Policy and Terms
  entry-server.tsx      server rendering of public pages
scripts/dev.mjs         local development launcher
railway.json            Railway build/start settings
```

## 11. Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development (website, API and local database) |
| `npm run typecheck` | Type-check frontend and server |
| `npm run build` | Production build into `dist/` and `build/` |
| `npm start` | Start the production server (used by Railway) |
| `npm run start:local` | Run the production build locally with a local database |
