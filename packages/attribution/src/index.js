/**
 * attribution: campaign formats, tracked links and "where did this lead come
 * from" logic. No dependencies; works in the browser and in Workers.
 */
export { FORMATS, findFormat, FORM_ID_PATTERN, generateFormId } from './formats.js';
export { normalizeAttribution, resolveSource, buildTrackedLink, slugify, UTM_KEYS, CLICK_ID_KEYS } from './attribution.js';
export { AttributionCollector } from './AttributionCollector.js';
