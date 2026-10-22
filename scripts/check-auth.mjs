import { pathToFileURL } from 'node:url';

// Read-only: no account lookup, sign-in, SMS or provider activation.
export async function checkAuthDeployment(origin, request = fetch) {
  const site = new URL(origin);
  if (site.protocol !== 'https:' || site.username || site.password) throw Error('Use an HTTPS site URL without credentials.');
  async function json(url) {
    const response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('Configuration request failed (HTTP ' + response.status + ').');
    return response.json();
  }
  const config = await json(new URL('/auth-config.json', site));
  if (config.enabled !== true || !config.firebase?.apiKey || !config.firebase?.projectId) throw Error('Firebase configuration is incomplete or disabled.');
  const endpoint = new URL('https://identitytoolkit.googleapis.com/v1/projects');
  endpoint.searchParams.set('key', config.firebase.apiKey);
  const project = await json(endpoint);
  if (!Array.isArray(project.authorizedDomains)) throw Error('Firebase did not return authorizedDomains.');
  const authorized = project.authorizedDomains.includes(site.hostname);
  return {
    origin: site.origin, projectId: config.firebase.projectId, hostname: site.hostname, authorized,
    authorizedDomains: project.authorizedDomains,
    declaredProviders: config.providers || [], phoneEnabled: config.phoneEnabled === true,
    note: 'Provider flags describe the frontend only; confirm backend activation in Firebase Console.',
    action: authorized ? 'Domain authorized. Real provider sign-in still needs an interactive test.' : 'Add exactly ' + site.hostname + ' in Firebase Authentication > Settings > Authorized domains.'
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await checkAuthDeployment(process.argv[2]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.authorized) process.exitCode = 1;
  } catch {
    // Do not print fetch exceptions containing the public API key or request URLs.
    console.error('Could not inspect authentication. Check the HTTPS URL, network and public Firebase configuration.');
    process.exitCode = 1;
  }
}
