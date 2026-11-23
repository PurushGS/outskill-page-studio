/**
 * page-kit: build landing pages from JSON with reusable, themeable blocks.
 *
 *   import { createDefaultRegistry, IconLibrary, PageRenderer } from './page-kit/src/index.js';
 *   const renderer = new PageRenderer({ registry: createDefaultRegistry(), icons: new IconLibrary() });
 *   const htmlDocument = renderer.render(pageJson);
 */
import { ComponentRegistry } from './core/ComponentRegistry.js';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';
import { FeatureGrid } from './components/FeatureGrid.js';
import { LeadForm } from './components/LeadForm.js';
import { Faq } from './components/Faq.js';
import { Footer } from './components/Footer.js';
import { GuideHero } from './components/GuideHero.js';
import { Checklist } from './components/Checklist.js';
import { ToolStrip } from './components/ToolStrip.js';
import { GuideLibrary } from './components/GuideLibrary.js';
import { TopVideos } from './components/TopVideos.js';
import { ShortsRow } from './components/ShortsRow.js';
import { ShowcaseHero } from './components/showcase/ShowcaseHero.js';
import { LogoBand } from './components/showcase/LogoBand.js';
import { WorkflowCards } from './components/showcase/WorkflowCards.js';
import { VideoSpotlight } from './components/showcase/VideoSpotlight.js';
import { GuidePreview } from './components/showcase/GuidePreview.js';
import { AudienceStages } from './components/showcase/AudienceStages.js';
import { ToolTiles } from './components/showcase/ToolTiles.js';
import { ShowcaseFaq } from './components/showcase/ShowcaseFaq.js';
import { ShowcaseFooter } from './components/showcase/ShowcaseFooter.js';
import { StickyBar } from './components/showcase/StickyBar.js';
import { GuideCard } from './components/showcase/GuideCard.js';
import { GuideSteps } from './components/showcase/GuideSteps.js';
import { GuideRest } from './components/showcase/GuideRest.js';

export { Component } from './core/Component.js';
export { ComponentRegistry } from './core/ComponentRegistry.js';
export { PageRenderer } from './core/PageRenderer.js';
export { PageValidator, SLUG_PATTERN } from './core/PageValidator.js';
export { html, raw, escapeHtml, safeUrl, SafeHtml } from './core/html.js';
export { Theme, DEFAULT_THEME, FONT_CHOICES, COLOR_TOKENS } from './theme/Theme.js';
export { IconLibrary } from './icons/IconLibrary.js';
export { youtubeId, youtubeThumbnail } from './core/media.js';
export { Header, Hero, FeatureGrid, LeadForm, Faq, Footer, GuideHero, Checklist, ToolStrip, GuideLibrary, TopVideos, ShortsRow };
export { ShowcaseHero, LogoBand, WorkflowCards, VideoSpotlight, GuidePreview, AudienceStages, ToolTiles, ShowcaseFaq, ShowcaseFooter, StickyBar, GuideCard, GuideSteps, GuideRest };

export function createDefaultRegistry() {
  return new ComponentRegistry()
    .register(Header)
    .register(GuideHero)
    .register(Hero)
    .register(Checklist)
    .register(ToolStrip)
    .register(GuideLibrary)
    .register(TopVideos)
    .register(ShortsRow)
    .register(FeatureGrid)
    .register(LeadForm)
    .register(Faq)
    .register(Footer)
    // The showcase family: the Outskill library look (styles/showcase.css).
    .register(ShowcaseHero)
    .register(LogoBand)
    .register(WorkflowCards)
    .register(VideoSpotlight)
    .register(GuidePreview)
    .register(AudienceStages)
    .register(ToolTiles)
    .register(ShowcaseFaq)
    .register(ShowcaseFooter)
    .register(StickyBar)
    .register(GuideCard)
    .register(GuideSteps)
    .register(GuideRest);
}
