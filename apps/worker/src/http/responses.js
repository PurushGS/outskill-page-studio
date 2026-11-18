/** Thrown anywhere in a handler; turned into a JSON error response by the entry point. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function htmlResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers } });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON');
  }
}

/** A plain message page (not found, ended campaign). Callers pass fixed text or cleaned values only. */
export function messageHtml(title, text) {
  return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui;padding:40px;text-align:center"><h1>${title}</h1><p>${text}</p></body>`;
}
