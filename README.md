# Page Studio

Campaign landing pages for every channel: YouTube, Instagram, X, LinkedIn, Facebook and WhatsApp. Ashutosh picks a format, edits a page in **/studio** without engineering help, and publishes. Every page carries an inline application form. He pastes the application **Form URL** (`https://applications.growthschool.io/<programId>/<formId>/<campaignId>`) once, and the page then shows that form's own questions and sends every application to that form and campaign in our application backend, the same way the LP Management System does.

```
Post / video / bio link → https://<site>/<slug>?utm_source=…&utm_campaign=…&utm_content=<post>
                            ▼
   Page with inline form.  Form URL …/5122/24542/19240  =  program 5122 · form 24542 · campaign 19240
                            │  GET /api/forms/24542/questionflow   → the form's questions are shown
                            ▼
   Name + email + phone valid  →  POST /api/leads            →  lead created (form 24542, campaign 19240, utm_*)
   each question answered      →  POST /api/leads/response   →  answer saved
   Submit                      →  last answer (fully submitted) + POST /api/leads/complete
                            ▼
      Success screen: resource links + WhatsApp community
```

The Worker calls the application backend (`FORM_API_URL`) for all of this (`apps/worker/src/leads/FormsApiClient.js`). The browser never talks to the backend directly and never chooses the form.

> **Setup needed:** the Worker needs the backend address and token from its environment: `FORM_API_URL` (a Worker variable) and `FORMS_API_TOKEN` (`npx wrangler secret put FORMS_API_TOKEN`); locally both go in `.dev.vars`. Without them, pages work but the form's questions and applications are refused with "not connected".

## For Ashutosh: making and changing pages

You never deploy anything. **Publish** in the studio is all it takes to put a page live.

1. **First time only:** open the studio link your engineer sent you (`https://…/studio#token=…`). It signs you in on this browser. Bookmark the page it opens.
2. **Pick a format** at the top left (YouTube, Instagram, X…). The number shows how many pages that format has.
   - If it has pages, pick one from **Page**.
   - If it has none, the template opens as a new page, ready to edit.
   - **+ New page** starts a new page in the selected format with the design you're looking at.
3. On the **Campaign** tab of a new page:
   - Type the **campaign name**. The page link is made from it (`AI Jobs · Nov 2026` → `/ai-jobs-nov-2026`) and cannot change after publishing. Renaming the campaign later keeps the same link.
   - Paste the **Form URL**: `https://applications.growthschool.io/<program>/<form>/<campaign>`. It's required, and you can change it later. Under the box you'll see the program, form and campaign it read from the link, and the form's questions appear in the preview.
   - The campaign ID is the page link, filled in automatically.
   - **Redirect URL** (optional, under Page link): after someone applies they see a thank-you and are sent to this link after 3 seconds, with a Continue button to go at once. Leave it empty to show the resource links and WhatsApp button instead.
   - Add the **resource links** people get after applying and the **WhatsApp community link**.
4. **Content**: click any text or icon in the preview to edit it. Move sections with ↑ ↓, remove with ✕, add with **+ Add section**. The application form has a 🔒: it stays on every page.
5. **Style**: palettes, colours, fonts, corner roundness. Check **Mobile** before publishing.
6. Press **Publish** (⌘S). The green bar gives you the **tracked link** for that format. Paste it in the post, video description or bio.
7. **One link per post:** on the Campaign tab, under "Tracked link to share", type a short name for the post (e.g. `jobs-video-1`, `story-nov-20`) and copy that link. Each application then records which post it came from.

**Campaign over?** Press **Unpublish**. Visitors see "This page is no longer available" and the form stops taking applications. The page stays in the studio, marked *(unpublished)*. **Publish again** brings it back at the same link.

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
    leads/                     LeadService (create lead → answers → complete) + FormsApiClient (the backend)
    controllers/, http/        HTTP layer: routing, auth, request context (device, geo)
  studio/                      the editor: PageStore (state, undo, drafts), panels, live preview
templates/<slug>/page.json     bundled starter pages (outskill-ai-resources is the base template)
scripts/                       new-page.js, setup-cloudflare.js
tests/                         libraries, every block, Worker end-to-end (create page → questions → lead → answers → complete, against a fake backend)
```

### Formats, form URLs and campaigns

- Formats live in `packages/attribution/src/formats.js`. Adding a channel means adding one entry.
- Each page has `campaign: { format, name, id, formUrl, redirectUrl? }`. The editor pastes `formUrl` in the studio. Any host works (`applications.growthschool.io`, `applications.outskill.com`). The path is numbers only: **program ID / form ID / campaign ID**, where the campaign ID is optional, so `…/1426/17216` is valid (`parseFormUrl` in `formats.js`). Without a campaign ID, no `campaign_id` is sent to the backend. `id` is set by the server to the page link (it becomes `utm_campaign` in tracked links) and is not edited. Several pages may share one form URL. It can be edited; the format cannot.
- The page slug is made from the campaign name on first publish (`slugify`) and is fixed afterwards. A name whose link already exists gets `409`. Every page must contain exactly one application form.

### How applications reach the backend (engineering)

The same calls as the LP Management System, made by the Worker with the `FORMS_API_TOKEN` secret (`FORM_API_URL` is the backend address; both come from the environment only, with no defaults in the code):

| Step | Backend call | Sent |
|---|---|---|
| Questions | `GET /forms/:formId/questionflow` | none (read-only, public) |
| Lead | `POST /leads?formId=` | `name`, `email`, `phone` (E.164), `leadUUID`, `campaign_id`, `utm_source/medium/content/term` and `utm_campaign` (= the page slug, plus `/<link's own>` if it has one). Returns the lead's token |
| Answers | `POST /leads/form/responses?formId=&leadUUID=` | `questionId`, `responses`, `optionIds`, …, `IsFullySubmitted`; header `gs-forms-user-auth-token` |
| Complete | `PATCH /leads/application/completed?leadUUID=` | none. Returns no redirect URL |

- The lead is created in the background as soon as name, email and phone are valid, and answers are sent one by one as they are given, so someone who leaves half way is still captured. The answer that completes the form (the one after which every shown question is answered) is held back, and Submit sends it with `IsFullySubmitted: true`, then completes the application. This is the same sequence as the LP Management System.
- The form ID always comes from the saved page's Form URL, never from the browser. A visitor on a stale page (Form URL changed since they loaded it) is asked to refresh.
- If the backend fails or `FORMS_API_TOKEN` is missing, the visitor sees "please try again" / "not connected", so nothing is lost silently.
- Not sent: the "send updates to my WhatsApp" tick box, device, geo, first touch and click IDs. The backend has no fields for them (as far as the LP Management System's calls show).

`utm_source/medium/content/term` are the visit's own values (the tracked link sets them); a visitor with none sends none. `utm_campaign` always starts with the page's slug (the page link). If the visitor's link has its own `utm_campaign`, it follows after a slash: `ai-jobs-nov-2026/example`. A link whose value is the slug itself (our tracked links) sends the slug once.

Spam: a hidden honeypot field. Bots that fill it get a normal-looking response, but nothing is created in the backend.

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

The page already calls a `Tracker` at the right moments: page viewed, form submitted (with the form URL), resource opened, WhatsApp clicked. Implement `class WebEngageTracker extends Tracker` and return it from `createTracker()` in `packages/lead-flow/src/browser.js`. Nothing else changes. For server-side events, add the call in `LeadService.submit()`.

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
