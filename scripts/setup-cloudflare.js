#!/usr/bin/env node
/**
 * One-time Cloudflare setup. Create-only: it never reuses, edits or deletes
 * anything that already exists on the account. If a name is already taken
 * it stops and says so, instead of touching the existing resource.
 *
 *   1. creates a new KV namespace for page designs and writes its id into wrangler.jsonc
 *   2. deploys this Worker under its own new name
 *   3. generates a studio password (STUDIO_TOKEN) and stores it as a secret on this Worker
 *   4. writes the editor's sign-in link (https://<site>/studio#token=…) to .studio-link
 *      (git- and asset-ignored). Send that link privately to whoever edits pages.
 *
 * Safe to re-run: steps already done (ids written, token saved) are skipped.
 *
 *   npx wrangler login   # once
 *   npm run setup
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const CONFIG = 'wrangler.jsonc';
const TOKEN_FILE = '.studio-token';
const LINK_FILE = '.studio-link';
const KV_TITLE = 'outskill-page-studio-pages';
const KV_PLACEHOLDER = 'REPLACE_WITH_PAGES_NAMESPACE_ID';

function wrangler(args, input) {
  return execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', input, stdio: [input ? 'pipe' : 'inherit', 'pipe', 'inherit'] });
}

function stop(message) {
  console.error(`✘ ${message}\n  Nothing existing was changed. Rename it in wrangler.jsonc / this script and run again.`);
  process.exit(1);
}

function createNamespace() {
  const existing = JSON.parse(wrangler(['kv', 'namespace', 'list']));
  if (existing.some((ns) => ns.title === KV_TITLE)) stop(`A KV namespace called "${KV_TITLE}" already exists on this account.`);
  const output = wrangler(['kv', 'namespace', 'create', KV_TITLE]);
  const id = output.match(/"id":\s*"([0-9a-f]{32})"/)?.[1];
  if (!id) throw new Error(`Could not read the new namespace id from:\n${output}`);
  return id;
}

/** On the very first deploy, refuse to overwrite a Worker that someone else already has under this name. */
function assertWorkerNameFree(name) {
  try {
    execFileSync('npx', ['wrangler', 'deployments', 'list', '--name', name], { stdio: 'ignore' });
  } catch {
    return; // not found: the name is free
  }
  stop(`A Worker called "${name}" already exists on this account.`);
}

function main() {
  let config = readFileSync(CONFIG, 'utf8');
  const workerName = config.match(/"name":\s*"([^"]+)"/)[1];
  const firstRun = !existsSync(TOKEN_FILE);

  if (firstRun) assertWorkerNameFree(workerName);

  if (config.includes(KV_PLACEHOLDER)) {
    config = config.replace(KV_PLACEHOLDER, createNamespace());
    writeFileSync(CONFIG, config);
    console.log(`✔ Created KV namespace ${KV_TITLE}`);
  }

  const deployOutput = wrangler(['deploy']);
  const siteUrl = deployOutput.match(/https:\/\/\S+\.workers\.dev/)?.[0];
  console.log(`✔ Deployed Worker ${workerName}${siteUrl ? ` at ${siteUrl}` : ''}`);

  let token = firstRun ? '' : readFileSync(TOKEN_FILE, 'utf8').trim();
  if (!token) {
    token = randomBytes(18).toString('base64url');
    wrangler(['secret', 'put', 'STUDIO_TOKEN'], token);
    writeFileSync(TOKEN_FILE, `${token}\n`, { mode: 0o600 });
  }

  if (siteUrl) {
    writeFileSync(LINK_FILE, `${siteUrl}/studio#token=${token}\n`, { mode: 0o600 });
    console.log(`✔ Editor sign-in link saved to ${LINK_FILE}. Send it privately; opening it once signs the editor in.`);
  }
}

main();
