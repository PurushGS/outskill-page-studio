import { createDefaultRegistry, IconLibrary, PageRenderer, PageValidator } from '../../../packages/page-kit/src/index.js';
import { templates } from '../../../templates/index.js';
import { Router } from './http/Router.js';
import { HttpError, json } from './http/responses.js';
import { StudioAuth } from './http/StudioAuth.js';
import { PageRepository } from './pages/PageRepository.js';
import { PageService } from './pages/PageService.js';
import { LeadService } from './leads/LeadService.js';
import { FormsApiClient } from './leads/FormsApiClient.js';
import { PageController } from './controllers/PageController.js';
import { LeadController } from './controllers/LeadController.js';
import { FileController } from './controllers/FileController.js';
import { PdfStore } from './files/PdfStore.js';

/**
 * Composition root: the only place that knows how the pieces are wired.
 * Everything else receives its collaborators through its constructor.
 */
export function createApp(env) {
  const basePath = publicBasePath(env);
  const registry = createDefaultRegistry();
  const auth = new StudioAuth(env.STUDIO_TOKEN);
  const pages = new PageRepository(env.PAGES, templates);

  const pageController = new PageController({
    pages,
    pageService: new PageService({ pages, validator: new PageValidator(registry) }),
    // Pages load their CSS/JS and post applications under the public path, so they work behind outskill.com/<path>/.
    renderer: new PageRenderer({ registry, icons: new IconLibrary(), assetBase: basePath }),
    auth,
  });
  const forms = new FormsApiClient({ baseUrl: env.FORM_API_URL, token: env.FORMS_API_TOKEN });
  const leadService = new LeadService({ api: forms, pages, publicBaseUrl: env.PUBLIC_BASE_URL });
  const leadController = new LeadController({ leadService });
  const fileController = new FileController({ files: new PdfStore(env.FILES), pages, auth, basePath });

  const router = new Router()
    .get('/studio', (request) => env.ASSETS.fetch(new URL('/apps/studio/', request.url)))
    .get('/api/pages', pageController.list)
    .post('/api/pages', pageController.create)
    .get('/api/pages/:slug', pageController.get)
    .put('/api/pages/:slug', pageController.save)
    .post('/api/pages/:slug/rename', pageController.rename)
    .post('/api/pages/:slug/unpublish', pageController.unpublish)
    .get('/api/templates/:slug', pageController.template)
    .get('/api/config', (request) => json({ publicBaseUrl: publicBaseUrl(env, request) }))
    .get('/api/forms/:formId/questionflow', leadController.questionFlow)
    .post('/api/leads', leadController.create)
    .post('/api/leads/response', leadController.saveResponse)
    .post('/api/leads/complete', leadController.complete)
    .post('/api/leads/notify', leadController.notify)
    .post('/api/files', fileController.upload)
    .get('/files/:key(pdfs/.+)', fileController.download)
    .get('/r/:slug', fileController.shortLink)
    .get('/', (request) => Response.redirect(new URL('/studio', request.url), 302))
    .get('/:slug', pageController.renderPage)
    // After someone applies, the page shows its form in the address: /<campaign>/<programId>/<formId>/<campaignId?>. That link opens the same page.
    .get('/:slug/:programId(\\d+)/:formId(\\d+)', pageController.renderPage)
    .get('/:slug/:programId(\\d+)/:formId(\\d+)/:campaignId(\\d+)', pageController.renderPage);

  return {
    async handle(request) {
      const url = new URL(request.url);
      const path = stripBasePath(url.pathname, basePath);
      // The public domain shows pages only; the studio and editing API stay on the app's own address.
      if (isPublicHost(env, url) && !PUBLIC_PATHS.test(path)) return notFoundPage();
      // Studio files run through the Worker (wrangler.jsonc run_worker_first) so the check above covers them too.
      if (/^\/(apps|templates)\//.test(url.pathname)) return env.ASSETS.fetch(request);
      const match = router.match(request.method, path);
      if (!match) {
        // Files requested under the public path (e.g. /resources/packages/…css) come from the static assets.
        if (request.method === 'GET' && path !== url.pathname) return env.ASSETS.fetch(new URL(path + url.search, url));
        return json({ error: 'Not found' }, 404);
      }
      try {
        return await match.handler(request, match.params);
      } catch (err) {
        if (err instanceof HttpError) return json({ error: err.message, details: err.details }, err.status);
        console.error(err);
        return json({ error: 'Something went wrong' }, 500);
      }
    },
  };
}

/**
 * What the public domain serves: a page (/<campaign>, or /<campaign>/<programId>/<formId>/<campaignId?>), its CSS/JS,
 * the application form's calls, and the emailed PDF (/r/<campaign> and /files/…). Everything else there is "not found".
 */
const PUBLIC_PATHS = /^\/(?:(?!studio\/?$)[a-z0-9-]+(?:\/\d+){0,3}\/?|packages\/.+|files\/pdfs\/.+|r\/[a-z0-9-]+\/?|api\/forms\/[^/]+\/questionflow|api\/leads(?:\/response|\/complete|\/notify)?)$/;

function isPublicHost(env, url) {
  return Boolean(env.PUBLIC_BASE_URL) && new URL(env.PUBLIC_BASE_URL).host === url.host;
}

function notFoundPage() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><p style="font:16px system-ui;text-align:center;margin-top:20vh">This page does not exist.</p>', {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * The address pages are shared on, e.g. https://outskill.com/resources. Set PUBLIC_BASE_URL
 * once the domain is connected; until then links use the address the studio is on.
 */
export function publicBaseUrl(env, request) {
  return (env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

/** "/resources" for https://outskill.com/resources, "" for a bare domain. */
function publicBasePath(env) {
  return env.PUBLIC_BASE_URL ? new URL(env.PUBLIC_BASE_URL).pathname.replace(/\/+$/, '') : '';
}

/**
 * Requests can arrive with the public path (a Worker route on outskill.com/resources/*,
 * or the workers.dev address) or without it (a proxy that strips it). Routing ignores it
 * either way; handlers get the original request, so Cloudflare's visitor info (request.cf) is kept.
 */
function stripBasePath(pathname, basePath) {
  if (!basePath || (pathname !== basePath && !pathname.startsWith(`${basePath}/`))) return pathname;
  return pathname.slice(basePath.length) || '/';
}
