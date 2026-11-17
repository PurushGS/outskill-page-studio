import { createDefaultRegistry, IconLibrary, PageRenderer, PageValidator } from '../../../packages/page-kit/src/index.js';
import { templates } from '../../../templates/index.js';
import { Router } from './http/Router.js';
import { HttpError, json } from './http/responses.js';
import { StudioAuth } from './http/StudioAuth.js';
import { PageRepository } from './pages/PageRepository.js';
import { PageService } from './pages/PageService.js';
import { LeadService } from './leads/LeadService.js';
import { HttpApplicationStore } from './leads/HttpApplicationStore.js';
import { NotConnectedApplicationStore } from './leads/NotConnectedApplicationStore.js';
import { PageController } from './controllers/PageController.js';
import { LeadController } from './controllers/LeadController.js';

/**
 * Composition root: the only place that knows how the pieces are wired.
 * Everything else receives its collaborators through its constructor.
 */
export function createApp(env) {
  const registry = createDefaultRegistry();
  const auth = new StudioAuth(env.STUDIO_TOKEN);
  const pages = new PageRepository(env.PAGES, templates);

  const pageController = new PageController({
    pages,
    pageService: new PageService({ pages, validator: new PageValidator(registry) }),
    renderer: new PageRenderer({ registry, icons: new IconLibrary() }),
    auth,
  });
  const leadController = new LeadController({ leadService: new LeadService({ store: createApplicationStore(env), pages }) });

  const router = new Router()
    .get('/studio', (request) => env.ASSETS.fetch(new URL('/apps/studio/', request.url)))
    .get('/api/pages', pageController.list)
    .post('/api/pages', pageController.create)
    .get('/api/pages/:slug', pageController.get)
    .put('/api/pages/:slug', pageController.save)
    .post('/api/pages/:slug/unpublish', pageController.unpublish)
    .get('/api/templates/:slug', pageController.template)
    .post('/api/leads', leadController.submit)
    .get('/', (request) => Response.redirect(new URL('/studio', request.url), 302))
    .get('/:slug', pageController.renderPage);

  return {
    async handle(request) {
      const url = new URL(request.url);
      const match = router.match(request.method, url.pathname);
      if (!match) return json({ error: 'Not found' }, 404);
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
 * ENGINEERING HOOK: where applications are saved. See leads/ApplicationStore.js
 * for the record shape and the two ways to connect our existing database.
 */
export function createApplicationStore(env) {
  if (env.APPLICATIONS_ENDPOINT) {
    return new HttpApplicationStore({ endpoint: env.APPLICATIONS_ENDPOINT, apiKey: env.APPLICATIONS_API_KEY });
  }
  return new NotConnectedApplicationStore();
}
