/**
 * Pulls the video id out of any YouTube link people paste:
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/. Returns '' if it isn't one.
 */
export function youtubeId(url) {
  let parsed;
  try {
    parsed = new URL(String(url ?? '').trim());
  } catch {
    return '';
  }
  const host = parsed.hostname.replace(/^(www|m)\./, '');
  let id = '';
  if (host === 'youtu.be') id = parsed.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1] || '';
  }
  return /^[\w-]{11}$/.test(id) ? id : '';
}

/**
 * Thumbnail straight from YouTube's image CDN: no API key, no player script,
 * so pages stay fast on phones. `hq` = 480×360, `mq` = 320×180.
 */
export function youtubeThumbnail(url, quality = 'hq') {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/${quality}default.jpg` : '';
}
