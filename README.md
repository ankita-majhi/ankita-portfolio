# Ankita Portfolio

A clean professional portfolio in white, slate, and blue, built with Next.js App Router and TypeScript.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Use `npm run build` and `npm start` for production. On Windows PowerShell with script restrictions, use `npm.cmd`.

## Design and interactions

- Interactive CSS 3D sculpture: click or press Enter to switch between blue and muted indigo.
- Subtle floating code artwork, gentle scroll reveals, and pointer-sensitive cards.
- Responsive navigation with active section indicators and a reading progress bar.
- Project filters and native accessible dialogs, including Escape and focus restoration.
- Motion pause control and automatic respect for reduced-motion preferences.
- Original HTML/CSS project previews; no external image assets or animation libraries.

## Personalize

Everything on the page is edited at [/admin](#the-admin-at-admin) once the backend is running.
`lib/defaults.ts` and `app/data.ts` hold the shipped defaults, used to seed the database and
as a fallback when it is unreachable.

Edit `lib/defaults.ts` to change those defaults, including your email, college, GitHub and LinkedIn URLs. Empty social links stay hidden. The contact form posts to the backend and stores the message in MongoDB. If the server cannot be reached, the visitor is not left stranded: with an email configured their mail app opens with the message, and otherwise the message downloads as a text draft, with clear feedback that nothing was sent.

The three projects are explicitly labeled concept studies. Replace them with your completed work when available. Tailor the learning roadmap and about/journey copy in `app/page.tsx` to your experience.

Styles are in `app/globals.css`; animation behavior is in `app/motion-details.tsx`. Typography uses DM Sans with system fallbacks, 16–18px body text, and clear section headings. Decorative captions are kept to a minimum.

## Backend

A MongoDB-backed API lives in `app/api`, with the database code in `lib/`.

### Getting a database

The free tier of [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) is enough, and
it is the same database a deployed site can use:

1. Create an account, then a free **M0** cluster.
2. Under **Database Access**, add a database user and note the password.
3. Under **Network Access**, add your IP address. Atlas connections silently time out until
   you do.
4. On the cluster, choose **Connect → Drivers** and copy the connection string.
5. Replace `<db_password>` in it with the real password. If the password contains
   `@ : / ? # [ ]`, percent-encode it first — `encodeURIComponent(password)` gives the right form.

For local development instead, install MongoDB Community Edition and use
`mongodb://127.0.0.1:27017`.

### Setup

```sh
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Connection string. Local `mongodb://127.0.0.1:27017`, or a MongoDB Atlas `mongodb+srv://` URI. |
| `MONGODB_DB` | Database name. Defaults to `ankita_portfolio`. |
| `ADMIN_TOKEN` | Secret that guards every admin endpoint. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `CONTACT_RATE_LIMIT` | Messages accepted from one IP per hour. Defaults to 5. |

Then load the three projects from `app/data.ts` into the database and create the indexes:

```sh
npm run seed
```

The seed is safe to re-run: projects match on their slug, skill cards on their title, and
the site copy is written once and then left alone so your admin edits survive. To put the
shipped text back:

```sh
npm run seed -- --reset-content
```

### Collections

- **messages** — contact form submissions, with `status` of `new`, `read`, or `archived`.
- **projects** — portfolio projects, keyed by `slug`, with a `published` flag and a sort `order`.
- **skills** — the Toolkit cards, with an icon name, tags and a sort `order`.
- **settings** — one document, `site`, holding every other piece of text on the homepage.

Indexes are created on first use, so a fresh database needs no manual setup.

### Endpoints

Every response is `{ ok, data }` or `{ ok: false, error, details }`. Admin routes need a
`Authorization: Bearer $ADMIN_TOKEN` header (`X-Admin-Token` also works).

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | public | Database connectivity and latency. |
| `POST` | `/api/contact` | public | Store a message from the contact form. |
| `GET` | `/api/contact` | admin | List messages, newest first. `?status=`, `?limit=`, `?skip=`. |
| `GET` | `/api/contact/:id` | admin | Read one message. |
| `PATCH` | `/api/contact/:id` | admin | Set `status` to `new`, `read`, or `archived`. |
| `DELETE` | `/api/contact/:id` | admin | Delete a message. |
| `GET` | `/api/projects` | public | Published projects, ordered. `?category=`. |
| `GET` | `/api/projects/:idOrSlug` | public | One published project, by slug or id. |
| `POST` | `/api/projects` | admin | Create a project. |
| `PATCH` | `/api/projects/:idOrSlug` | admin | Update some fields. |
| `PUT` | `/api/projects/:idOrSlug` | admin | Replace a project. |
| `DELETE` | `/api/projects/:idOrSlug` | admin | Delete a project. |
| `GET` | `/api/skills` | public | Skill cards, in display order. |
| `POST` | `/api/skills` | admin | Add a skill card. |
| `PATCH` | `/api/skills/:id` | admin | Update a skill card. |
| `DELETE` | `/api/skills/:id` | admin | Delete a skill card. |
| `GET` | `/api/settings` | public | The site copy, with defaults filled in. |
| `PUT` | `/api/settings` | admin | Update one or more sections of the site copy. |

Admins can add `?includeUnpublished=1` to `/api/projects` to see drafts.

### The admin at /admin

Visit [http://localhost:3000/admin](http://localhost:3000/admin) and paste your `ADMIN_TOKEN`.
Four tabs cover everything on the site:

| Tab | What you can change |
| --- | --- |
| **Messages** | Read enquiries, mark read/unread, archive and restore, delete, and reply — the reply button opens your mail app with the original quoted. |
| **Projects** | Add, edit, reorder, hide and delete projects. A new category becomes a filter button on the homepage automatically. |
| **Skills** | Add, edit, reorder and delete the cards in the Toolkit section, each with an icon and tags. |
| **Site content** | Every other piece of text: your name, email and social links, the hero, focus strip, section headings, About paragraphs and steps, the journey timeline, contact copy and footer. |

Changes are live on the next page load — the homepage is rendered per request.

Two conventions in the text fields: a newline becomes a line break, and in the About
paragraphs `*text between asterisks*` renders in italics.

The token is held in `sessionStorage`, so it survives a page reload but is gone when you close
the tab. The page is marked `noindex`, and it is not linked from anywhere on the site. Nothing
loads until the token is accepted.

Reading the same messages from a terminal, if you prefer. In PowerShell, `curl` is an alias for
`Invoke-WebRequest` and does not take `-H`, so use:

```powershell
$token = (Get-Content ".env.local" | Select-String '^ADMIN_TOKEN=').ToString().Split('=')[1]
$r = Invoke-RestMethod -Uri "http://localhost:3000/api/contact" -Headers @{ Authorization = "Bearer $token" }
$r.data.items | ForEach-Object { "$($_.createdAt) [$($_.status)]`n$($_.name) <$($_.email)>`n$($_.message)`n" }
```

In Git Bash, WSL, or any real `curl`:

```sh
curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/contact
```

### How submissions are protected

- Every field is validated and trimmed on the server; the browser's own `required` and
  `maxLength` rules are a convenience, not the guard.
- A hidden honeypot field rejects the bots that fill in every input they find.
- One IP can send `CONTACT_RATE_LIMIT` messages per hour.
- `ADMIN_TOKEN` is compared in constant time, so the response timing gives nothing away.
- The homepage reads its content from MongoDB, and falls back to the text in
  `lib/defaults.ts` and `app/data.ts` if the database is empty or unreachable — so the site
  still renders when the database is down.

## Checks

```sh
npm run typecheck
npm run build
node preview-check.cjs
```

The browser check requires the dev server, a reachable MongoDB, and Microsoft Edge. It verifies desktop/mobile layouts, filtering, dialogs, keyboard interactions, motion preferences, contact delivery into MongoDB, and the offline draft fallback, and saves previews to `artifacts/`.
