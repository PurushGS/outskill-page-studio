# Page Studio

Campaign landing pages for every channel: YouTube, Instagram, X, LinkedIn, Facebook and WhatsApp. Ashutosh picks a format, edits a page in **/studio** without engineering help, and publishes. Every page carries an inline application form, saved under the form ID Ashutosh enters. Each submission is turned into one complete **Application** record (applicant + campaign name + form ID + attribution) and handed to an engineering hook that saves it into our existing application-form table.

```
Post / video / bio link → https://<site>/<slug>?utm_source=…&utm_campaign=…&utm_content=<post>
                            ▼
                 Inline application form  (form ID e.g. YT-7KQ2MD)
                            │  POST /api/leads
                            ▼
      Application record: applicant + form ID + format + campaign name/ID
                          + source, utm_*, click ID, referrer, first touch, device, country
                            ▼
      ApplicationStore  ← ENGINEERING HOOK → our existing DB / application-form table
                            ▼
      Success screen: resource links + WhatsApp community
```

> **Status:** the hook is not connected yet. Pages work, but applications are **not saved** until engineering connects it (see "Connecting applications to our database").

## For Ashutosh: making and changing pages

You never deploy anything. **Publish** in the studio is all it takes to put a page live.

1. **First time only:** open the studio link your engineer sent you (`https://…/studio#token=…`). It signs you in on this browser. Bookmark the page it opens.
2. **Pick a format** at the top left (YouTube, Instagram, X…). The number shows how many pages that format has.
   - If it has pages, pick one from **Page**.
   - If it has none, the template opens as a new page, ready to edit.
   - **+ New page** starts a new page in the selected format with the design you're looking at.
3. On the **Campaign** tab of a new page:
   - Type the **campaign name**. The page link is made from it (`AI Jobs · Nov 2026` → `/ai-jobs-nov-2026`) and cannot change after publishing. Renaming the campaign later keeps the same link.
   - Type the **Form ID**: the ID of the application form in our system. It's required, and you can change it later.
   - The campaign ID fills itself in (you can change it).
   - Add the **resource links** people get after applying and the **WhatsApp community link**.
4. **Content**: click any text or icon in the preview to edit it. Move sections with ↑ ↓, remove with ✕, add with **+ Add section**. The application form has a 🔒: it stays on every page.
5. **Style**: palettes, colours, fonts, corner roundness. Check **Mobile** before publishing.
6. Press **Publish** (⌘S). The green bar gives you the **tracked link** for that format. Paste it in the post, video description or bio.
7. **One link per post:** on the Campaign tab, under "Tracked link to share", type a short name for the post (e.g. `jobs-video-1`, `story-nov-20`) and copy that link. Each application then records which post it came from.

Undo (button or ⌘Z) goes back one change at a time. If Publish asks for a password, open your studio link once more.

## For engineers

```bash
cp .dev.vars.example .dev.vars                          # STUDIO_TOKEN=dev-token for local use
npm test                                                 # node:test, no install needed (Node 20+)
npx wrangler dev                                         # http://localhost:8787/studio#token=dev-token
```

### Layout

```
packages/                      reusable libraries: no build step, no dependencies
  page-kit/                    JSON → HTML page builder
    src/core/                  Component, ComponentRegistry, PageRenderer, PageValidator, html + media helpers
    src/components/            Header, GuideHero, Hero, Checklist, ToolStrip, GuideLibrary, TopVideos,
                               ShortsRow, FeatureGrid, LeadForm (application form), Faq, Footer
    src/theme/, src/icons/     theming and icons
    styles/page-kit.css        mobile-first styles driven by theme variables
  lead-flow/                   application form behaviour (validation shared with the server, submit, success screen)
  attribution/                 formats (YT/IG/X/LI/FB/WA), source resolution, tracked links, first-touch collector
apps/
  worker/                      Cloudflare Worker
    pages/                     PageRepository (KV + bundled templates), PageService (create/update rules)
    leads/                     LeadService, ApplicationStore (engineering hook) + Http / NotConnected stores
    controllers/, http/        HTTP layer: routing, auth, request context (device, geo)
  studio/                      the editor: PageStore (state, undo, drafts), panels, live preview
templates/<slug>/page.json     bundled starter pages (outskill-ai-resources is the base template)
scripts/                       new-page.js, setup-cloudflare.js
tests/                         libraries, every block, Worker end-to-end (create page → apply → Application at the hook)
```

### Formats, form IDs and campaigns

- Formats live in `packages/attribution/src/formats.js`. Adding a channel means adding one entry.
- Each page has `campaign: { format, name, id, formId }`. The editor types `formId` in the studio: the ID of the form in our application-form table (letters, numbers, `.` `-` `_`). Several pages may share one. It can be edited; the format cannot.
- The page slug is made from the campaign name on first publish (`slugify`) and is fixed afterwards. A name whose link already exists gets `409`. Every page must contain exactly one application form.

### Connecting applications to our database (engineering)

Everything is in `apps/worker/src/leads/ApplicationStore.js`: the full **Application** shape (form ID, format, campaign name/ID, applicant, attribution, first touch, device, geo) and the rules for `save()`. There are two ways to connect:

- **A. Endpoint, no code here.** Add a route on our backend that inserts into the application-form table. Then set `APPLICATIONS_ENDPOINT` (a `vars` entry in `wrangler.jsonc`) and `npx wrangler secret put APPLICATIONS_API_KEY`, and deploy. `HttpApplicationStore` POSTs each Application as JSON with `Authorization: Bearer …` and `Idempotency-Key: <applicationId>`. Any 2xx counts as saved.
- **B. Direct.** Write a class with the same `save(application)` method (e.g. via Cloudflare Hyperdrive to our Postgres/MySQL) and return it from `createApplicationStore()` in `apps/worker/src/app.js`.

If `save()` throws, the visitor sees "please try again", so nothing is lost silently. Until it's connected, `NotConnectedApplicationStore` logs a warning (form ID and campaign only, never personal data) and saves nothing. Dedupe on `applicant.email + form.id` in our DB if repeat applications matter.

`attribution.source` = utm_source → `src` → the referring site's channel (youtube.com → youtube, t.co → x, …) → the referring domain → `direct`.

Spam: a hidden honeypot field. Bots that fill it get a normal-looking response, but nothing is sent to the hook.

### Design rules

- **Pages are data.** A page is JSON: `meta`, `theme`, `integrations` and an ordered `blocks` list. The studio edits that JSON, and the Worker renders it.
- **Components describe themselves.** Each block class declares `static schema` and `static defaults`. The studio builds its forms and its "Add section" list from these, so a new block needs no studio code.
- **One renderer everywhere.** `PageRenderer` runs in the Worker and in the studio preview, so what you edit is what ships.
- **Dependencies are injected.** `apps/worker/src/app.js` and `apps/studio/src/main.js` are the only places where things are wired together.
- **Safe by default.** Text is escaped, `javascript:` links are blocked, and theme values and pages are validated before they are saved.

### Adding a block

```js
export class Testimonials extends Component {
  static type = 'testimonials';
  static label = 'Testimonials';
  static schema = [{ key: 'title', label: 'Title', kind: 'text' } /* text | textarea | url | icon | list */];
  static defaults = { title: 'What people say' };
  renderContent() { return html`<div class="pk-container">…</div>`; }
}
```

Register it in `createDefaultRegistry()` and add its CSS. It then shows up under **+ Add section** in the studio.

### Adding analytics (WebEngage) later

The page already calls a `Tracker` at the right moments: page viewed, form submitted (with the form ID), resource opened, WhatsApp clicked. Implement `class WebEngageTracker extends Tracker` and return it from `createTracker()` in `packages/lead-flow/src/browser.js`. Nothing else changes. For server-side events, add the call in `LeadService.submit()`.

## Deploy (Cloudflare Workers)

Who does what:

| Task | Who | How |
|---|---|---|
| Edit or create pages | Ashutosh | **Publish** in the studio: live in about a minute, no deploy |
| First deploy (once) | Engineer | `npx wrangler login`, then `npm run setup` |
| Code changes | Nobody, it's automatic | push to `main`; GitHub Actions runs the tests and deploys |
| Undo a bad code deploy | Engineer | `npx wrangler rollback` |

**First deploy.** `npm run setup` creates the KV namespace (create-only: it stops instead of touching anything that already exists), deploys, generates the studio password and writes the editor's sign-in link to `.studio-link`. Send that link to Ashutosh privately (it is a password; don't post it in a channel). Both files are git- and asset-ignored. Commit the updated `wrangler.jsonc`; it now contains the KV ids.

**Automatic deploys.** Push the repo to GitHub and add two repository secrets: `CLOUDFLARE_API_TOKEN` (create it with the "Edit Cloudflare Workers" template) and `CLOUDFLARE_ACCOUNT_ID`. Then `.github/workflows/deploy.yml` tests and deploys every push to `main`.

**Custom domain (optional).** Cloudflare dashboard → Workers → outskill-page-studio → Settings → Domains & Routes → add e.g. `learn.outskill.com`. Old `workers.dev` links keep working.

**New editor or leaked link?** Delete `.studio-token` and `.studio-link`, then run `npm run setup` again. It sets a new password (the old link stops working) and writes a fresh link.


## Known limits

- The studio password is one shared token. Put Cloudflare Access in front of `/studio` and `/api/pages/*` when more people edit.
- There is no bot protection on `/api/leads` yet. Add Cloudflare Turnstile before a big video drops.
- First touch lives in the visitor's browser (localStorage), so it's per device and cleared if they clear site data.
