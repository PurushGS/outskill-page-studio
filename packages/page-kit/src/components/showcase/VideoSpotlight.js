import { html, safeUrl } from '../../core/html.js';
import { youtubeThumbnail } from '../../core/media.js';
import { ShowcaseBlock, TONE_FIELD, svg, videoThumb } from './ShowcaseBlock.js';

/** "Top 5 videos of the week" (one featured, the rest numbered) and a scrolling row of Shorts and reels. */
export class VideoSpotlight extends ShowcaseBlock {
  static type = 'sc-videos';
  static label = 'Showcase · Top videos and Shorts';
  static schema = [
    TONE_FIELD,
    { key: 'eyebrow', label: 'Small label above title', kind: 'text' },
    { key: 'title', label: 'Title', kind: 'text' },
    { key: 'text', label: 'Text', kind: 'textarea' },
    { key: 'subscribeLabel', label: 'Button text', kind: 'text' },
    { key: 'subscribeUrl', label: 'Button link', kind: 'url' },
    { key: 'badge', label: 'Badge on the first video', kind: 'text' },
    {
      key: 'videos',
      label: 'Videos (first is featured)',
      kind: 'list',
      itemSchema: [
        { key: 'url', label: 'YouTube link', kind: 'url' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'duration', label: 'Length, e.g. 26:53', kind: 'text' },
        { key: 'views', label: 'Views note, e.g. 353K views this week', kind: 'text' },
        { key: 'note', label: 'Lime note, e.g. Guide inside', kind: 'text' },
      ],
    },
    { key: 'shortsTitle', label: 'Shorts: title (empty hides the row)', kind: 'text' },
    { key: 'shortsText', label: 'Shorts: text', kind: 'text' },
    {
      key: 'shorts',
      label: 'Shorts and reels',
      kind: 'list',
      itemSchema: [
        { key: 'url', label: 'YouTube Shorts or Instagram link', kind: 'url' },
        { key: 'image', label: 'Cover image link (needed for Instagram)', kind: 'url' },
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'meta', label: 'Small line, e.g. 0:54 · 17K views', kind: 'text' },
      ],
    },
  ];
  static defaults = {
    tone: 'dark',
    eyebrow: 'This week on Outskill · Most watched',
    title: 'Top 5 videos of the week',
    text: 'The breakdowns everyone’s watching this week, each with its full guide in the library.',
    subscribeLabel: 'Subscribe on YouTube',
    subscribeUrl: 'https://www.youtube.com/channel/UCNssyoLJiA2oB5xM7XjxmJA?sub_confirmation=1',
    badge: '#1 This Week',
    videos: [
      { url: 'https://www.youtube.com/watch?v=v_XdN5-ya9A', title: 'How to Use REA GitHub to Reverse Engineer Anything in Claude Code', duration: '16:12', views: '329K views', note: 'Guide inside' },
      { url: 'https://www.youtube.com/watch?v=cp41jdgFBDg', title: 'I Built My Own Jarvis with Claude Code (No Code Setup)', duration: '19:19', views: '99K views', note: 'Guide inside' },
      { url: 'https://www.youtube.com/watch?v=duT2ld4zWGE', title: 'Build Your Own AI Employee That Replaces You at Work', duration: '21:24', views: '13K views', note: '' },
      { url: 'https://www.youtube.com/watch?v=HsgsYdV1XoQ', title: 'Stop Paying for Claude Code (3 Ways to Actually Use It for Free)', duration: '31:34', views: '7.8K views', note: 'Guide inside' },
      { url: 'https://www.youtube.com/watch?v=rcybc6fPioY', title: 'Stop Using AI the Wrong Way (ChatGPT, Claude and Gemini)', duration: '24:01', views: '3.2K views', note: '' },
    ],
    shortsTitle: 'The 60-second versions',
    shortsText: 'Latest Shorts and reels from Outskill, for when you only have a minute.',
    shorts: [
      { url: 'https://www.youtube.com/shorts/ySeuS-WVVm0', image: '', title: 'The secret to building a real AI assistant', meta: '0:54 · 17K views' },
      { url: 'https://www.youtube.com/shorts/sHNskfRLyNY', image: '', title: 'Stop writing bad prompts. Do this instead.', meta: '0:55 · 9.4K views' },
      { url: 'https://www.youtube.com/shorts/qSjltjRBFmw', image: '', title: 'Is this the end of paid AI APIs?', meta: '0:36 · 3.4K views' },
      { url: 'https://www.youtube.com/shorts/hqVv2YJhB_E', image: '', title: 'Turn any screenshot into a website', meta: '1:00 · 3.3K views' },
      { url: 'https://www.youtube.com/shorts/HFG0QpZOVoc', image: '', title: 'How to build your own AI billionaire council', meta: '0:59 · 2.9K views' },
    ],
  };

  renderContent() {
    const p = this.props;
    const [featured, ...rest] = p.videos;
    return html`<div class="o-in">
      <div class="o-shead"><div>
        ${p.eyebrow ? html`<p class="o-lbl"${this.editable('eyebrow')}>${p.eyebrow}</p>` : ''}
        <h2 class="o-t2"${this.editable('title')}>${p.title}</h2>
        ${p.text ? html`<p class="o-p"${this.editable('text')}>${p.text}</p>` : ''}
      </div>${this.button(p.subscribeLabel, p.subscribeUrl, { variant: 'dark', icon: 'youtube', attrs: this.editable('subscribeLabel') })}</div>
      ${featured ? html`<div class="o-topw">${this.#featured(featured)}<div class="o-rlist">${rest.map((v, i) => this.#row(v, i + 1))}</div></div>` : ''}
      ${p.shortsTitle && p.shorts.length ? this.#shorts() : ''}
    </div>`;
  }

  #featured(v) {
    const badge = this.props.badge ? html`<span class="o-rk"${this.editable('badge')}>${this.props.badge}</span>` : '';
    return html`<a class="o-feat" href="${safeUrl(v.url)}" target="_blank" rel="noopener noreferrer"${this.editable('videos.0.url')}>
      ${videoThumb(v.url, v.duration, badge)}
      <h3${this.editable('videos.0.title')}>${v.title}</h3>
      <div class="o-fm">${v.views ? html`<span>${v.views}</span>` : ''}${v.note ? html`<span class="o-gi">${v.note}</span>` : ''}<span class="o-yt">${svg('out')}Watch on YouTube</span></div>
    </a>`;
  }

  #row(v, i) {
    const meta = [v.views].filter(Boolean).join('');
    return html`<a class="o-ri" href="${safeUrl(v.url)}" target="_blank" rel="noopener noreferrer"${this.editable(`videos.${i}.url`)}>
      <span class="n">${String(i + 1).padStart(2, '0')}</span>${videoThumb(v.url, v.duration)}
      <div><b${this.editable(`videos.${i}.title`)}>${v.title}</b><span class="o-meta">${meta}${meta && v.note ? ' · ' : ''}${v.note ? html`<em class="o-gi">${v.note}</em>` : ''}</span></div>
    </a>`;
  }

  #shorts() {
    const p = this.props;
    return html`<div class="o-subh"><div><h3 class="o-t3"${this.editable('shortsTitle')}>${p.shortsTitle}</h3>${p.shortsText ? html`<span class="o-meta"${this.editable('shortsText')}>${p.shortsText}</span>` : ''}</div>
      <div class="o-arrows"><button type="button" class="o-sq" data-reel-scroll="-1" aria-label="Previous">${svg('back')}</button><button type="button" class="o-sq on" data-reel-scroll="1" aria-label="Next">${svg('arrow')}</button></div></div>
    <div class="o-reels" data-reels>${p.shorts.map((s, i) => {
      const reel = /instagram\.com/i.test(s.url || '');
      const src = s.image || youtubeThumbnail(s.url, 'hq');
      return html`<a class="o-rc9" href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer"${this.editable(`shorts.${i}.url`)}>
        ${src ? html`<img src="${src}" alt="" loading="lazy">` : ''}
        <span class="pf">${svg(reel ? 'instagram' : 'youtube')}${reel ? 'Reel' : 'Short'}</span><span class="o-pbtn">${svg('play')}</span>
        <span class="cp"><b${this.editable(`shorts.${i}.title`)}>${s.title}</b>${s.meta ? html`<span>${s.meta}</span>` : ''}</span>
      </a>`;
    })}</div>`;
  }
}
