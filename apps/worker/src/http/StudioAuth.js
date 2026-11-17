import { HttpError } from './responses.js';

/**
 * Guards studio write endpoints with a shared token (the STUDIO_TOKEN secret).
 * Good enough for a prototype used by a small team; swap for Cloudflare
 * Access in front of /studio and /api/pages when more people need access.
 */
export class StudioAuth {
  constructor(token) {
    this.token = token;
  }

  assert(request) {
    if (!this.token) throw new HttpError(503, 'STUDIO_TOKEN is not configured on the server');
    const given = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!timingSafeEqual(given, this.token)) throw new HttpError(401, 'Wrong or missing studio token');
  }
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
