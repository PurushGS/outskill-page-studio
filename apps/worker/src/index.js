import { createApp } from './app.js';

export default {
  fetch(request, env) {
    return createApp(env).handle(request);
  },
};
