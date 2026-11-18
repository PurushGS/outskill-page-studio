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
  const registry = createDefaultRegistry();
  const auth = new StudioAuth(env.STUDIO_TOKEN);
  const pages = new PageRepository(env.PAGES, templates);

  const pageController = new PageController({
    pages,
    pageService: new PageService({ pages, validator: new PageValidator(registry) }),
    renderer: new PageRenderer({ registry, icons: new IconLibrary() }),
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
    .get('/api/forms/:formId/questionflow', leadController.questionFlow)
    .post('/api/leads', leadController.create)
    .post('/api/leads/response', leadController.saveResponse)
    .post('/api/leads/complete', leadController.complete)
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
