import assert from 'node:assert/strict';
import { checkAuthDeployment } from '../scripts/check-auth.mjs';

function fixture(domains, status = 200) {
  const calls = [];
  return { calls, request: async (url, options) => {
    url = new URL(url); calls.push(url);
    assert.equal(options.redirect, 'error');
    assert(!options.method || options.method === 'GET');
    return { ok: status === 200, status, json: async () => calls.length === 1
      ? {enabled:true, firebase:{apiKey:'public-test-key',projectId:'demo'},providers:['google.com'],phoneEnabled:false}
      : {authorizedDomains:domains} };
  }};
}
const hostname = 'kyroshix-preview.kyroshixcorp.workers.dev';
for (const domains of [['releases.kyroshixcorp.workers.dev'], [hostname], ['workers.dev'], ['https://' + hostname], [hostname + '.evil.test']]) {
  const f = fixture(domains);
  const result = await checkAuthDeployment('https://' + hostname + '/inicio?token=never-forward', f.request);
  assert.equal(result.authorized, domains.includes(hostname));
  assert.deepEqual(result.declaredProviders, ['google.com']);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[0].href, 'https://' + hostname + '/auth-config.json');
  assert.equal(f.calls[1].origin, 'https://identitytoolkit.googleapis.com');
  assert(!JSON.stringify(result).includes('public-test-key'));
  assert(!JSON.stringify(result).includes('never-forward'));
}
await assert.rejects(checkAuthDeployment('http://' + hostname, fixture([]).request));
await assert.rejects(checkAuthDeployment('https://user:password@' + hostname, fixture([]).request));
await assert.rejects(checkAuthDeployment('https://' + hostname, fixture([],403).request), /HTTP 403/);
await assert.rejects(checkAuthDeployment('https://' + hostname, fixture(null).request), /authorizedDomains/);
console.log('PASS: read-only domain diagnostics, exact host matching, invalid URLs, HTTP failures and safe report.');
