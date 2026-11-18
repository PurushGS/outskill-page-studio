import { createDefaultRegistry, IconLibrary, PageRenderer } from '../../../packages/page-kit/src/index.js';
import { PageStore } from './PageStore.js';
import { StudioApi } from './StudioApi.js';
import { StudioApp } from './StudioApp.js';

const registry = createDefaultRegistry();
const icons = new IconLibrary();
const api = new StudioApi();
// Links are shown and copied with the public domain even when the studio is opened on another address.
const { publicBaseUrl } = await api.getConfig().catch(() => ({ publicBaseUrl: location.origin }));

new StudioApp({
  root: document.body,
  store: new PageStore(),
  api,
  publicBaseUrl,
  renderer: new PageRenderer({ registry, icons, assetBase: location.origin }),
  registry,
  icons,
}).start();
