import { createDefaultRegistry, IconLibrary, PageRenderer } from '../../../packages/page-kit/src/index.js';
import { PageStore } from './PageStore.js';
import { StudioApi } from './StudioApi.js';
import { StudioApp } from './StudioApp.js';

const registry = createDefaultRegistry();
const icons = new IconLibrary();

new StudioApp({
  root: document.body,
  store: new PageStore(),
  api: new StudioApi(),
  renderer: new PageRenderer({ registry, icons, assetBase: location.origin }),
  registry,
  icons,
}).start();
