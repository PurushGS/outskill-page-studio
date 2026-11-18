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
  const leadController = new LeadController({ leadService: new LeadService({ api: forms, pages }) });

  const router = new Router()
    .get('/studio', (request) => env.ASSETS.fetch(new URL('/apps/studio/', request.url)))
    .get('/api/pages', pageController.list)
    .post('/api/pages', pageController.create)
    .get('/api/pages/:slug', pageController.get)
    .put('/api/pages/:slug', pageController.save)
    .post('/api/pages/:slug/unpublish', pageController.unpublish)
    .get('/api/templates/:slug', pageController.template)
    .get('/api/config', (request) => json({ publicBaseUrl: publicBaseUrl(env, request) }))
    .get('/api/forms/:formId/questionflow', leadController.questionFlow)
    .post('/api/leads', leadController.create)
    .post('/api/leads/response', leadController.saveResponse)
    .post('/api/leads/complete', leadController.complete)
    .get('/', (request) => Response.redirect(new URL('/studio', request.url), 302))
    .get('/:slug', pageController.renderPage);

  return {
    async handle(request) {
      const url = new URL(request.url);
      const path = stripBasePath(url.pathname, basePath);
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
