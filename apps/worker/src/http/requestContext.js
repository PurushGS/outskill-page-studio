/**
 * What the server can tell about a visitor without asking them: device type
 * and OS from the User-Agent, and location from Cloudflare's edge (request.cf).
 */
export function describeRequest(request) {
  const ua = request.headers.get('User-Agent') || '';
  const cf = request.cf || {};
  return {
    device: /iPad|Tablet|Nexus (7|9|10)|SM-T/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone|iPod/i.test(ua) ? 'mobile' : 'desktop',
    os: /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : /Windows/i.test(ua) ? 'windows' : /Mac OS X|Macintosh/i.test(ua) ? 'mac' : /Linux/i.test(ua) ? 'linux' : 'other',
    geoCountry: cf.country || '',
    geoRegion: cf.region || '',
    geoCity: cf.city || '',
  };
}
