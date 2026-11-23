// the augmentation in this file only applies where the spec is part of the program
import type {} from './rtdModule/spec.js';

export interface ChromeAiLanguageDetectorParams {
  /** Defaults to `true`. */
  enabled?: boolean;
  /** Minimum confidence (0 - 1) of the detected language. Defaults to `0.8`. */
  confidence?: number;
  /** Defaults to `'site.content.language'`. */
  ortb2Path?: string;
}

/**
 * @deprecated The Summarizer API is no longer used; use `keywords`. `enabled: true` turns on `keywords` (unless
 * `keywords.enabled` is set) with this `ortb2Path` and `cacheInLocalStorage`, and logs a warning.
 */
export interface ChromeAiSummarizerParams {
  enabled?: boolean;
  ortb2Path?: string;
  cacheInLocalStorage?: boolean;
  [key: string]: unknown;
}

export interface ChromeAiKeywordsParams {
  /** Extracts keywords with the Prompt API. Defaults to `false`. */
  enabled?: boolean;
  /** Defaults to `10`. */
  maxKeywords?: number;
  /**
   * Replaces the default instruction. The module still appends the page text, and the response is still
   * constrained by its JSON schema. Must be a non-empty string.
   */
  prompt?: string;
  /**
   * Defaults to `'site.content.keywords'`, which gets a comma-separated string. A path ending in `kwarray` gets an array.
   */
  ortb2Path?: string;
  /** Defaults to `true`. */
  cacheInLocalStorage?: boolean;
}

/**
 * AdCOM `cattax` of the supported taxonomies: 1 is IAB Content Category Taxonomy 1.0, 6 is IAB Content Taxonomy 2.2.
 */
export type ChromeAiCategoryTaxonomy = 1 | 6;

export interface ChromeAiCategoriesParams {
  /**
   * Classifies the page into tier 1 categories of `taxonomy`, written to `site.pagecat`. Uses the Decisions API or
   * the Prompt API, whichever model is already on the device, preferring the Decisions API's smaller download.
   * Defaults to `false`.
   */
  enabled?: boolean;
  /** Defaults to `6`. */
  taxonomy?: ChromeAiCategoryTaxonomy;
  /** Defaults to `1`. */
  maxCategories?: number;
  /**
   * Only classifies pages with a JSON-LD node of type `Article`, `NewsArticle` or `BlogPosting`, which home, section,
   * search and tag pages usually lack. Defaults to `true`.
   */
  articlesOnly?: boolean;
  /**
   * Replaces the default instruction. With the Prompt API, the module still appends the tier 1 category names and the
   * page text, and the response is still constrained by its JSON schema; with the Decisions API, it is the question
   * asked over the category names. Must be a non-empty string.
   */
  prompt?: string;
  /**
   * With taxonomy 6, also writes the categories to `site.content.data` as a `segtax` 6 entry, which `gptPreAuction`
   * sends to Google Ad Manager as `IAB_CONTENT_2_2` Publisher Provided Signals. Defaults to `true`.
   */
  gamPps?: boolean;
  /** Defaults to `true`. */
  cacheInLocalStorage?: boolean;
}

export interface ChromeAiDecisionOption {
  /** The answer written to `site.content.data`. */
  label: string;
  description?: string;
}

/**
 * A question in the shape of the Decisions API (`DecisionModel`) schema.
 */
export interface ChromeAiDecisionQuestion {
  /** Segment `id` in `site.content.data`. */
  id: string;
  type: 'boolean' | 'choice' | 'score';
  prompt: string;
  /** Required for `choice`. For `score`, defaults to `'1'` - `'5'`. */
  options?: ChromeAiDecisionOption[];
}

export interface ChromeAiDecisionsParams {
  /**
   * Answers the questions about the page with the Decisions API, written to `site.content.data`. Defaults to `false`.
   */
  enabled?: boolean;
  questions?: ChromeAiDecisionQuestion[];
  /** Answers with a lower Decisions API confidence (0 - 1) are dropped. Defaults to `0`. */
  minConfidence?: number;
  /**
   * Also allows the Prompt API, used when its model is already on the device and the Decisions API's isn't, or when
   * the Decisions API can't be used. Defaults to `true`.
   */
  promptFallback?: boolean;
  /** Defaults to `true`. */
  cacheInLocalStorage?: boolean;
}

export interface ChromeAiRtdParams {
  languageDetector?: ChromeAiLanguageDetectorParams;
  /** @deprecated Use `keywords`. */
  summarizer?: ChromeAiSummarizerParams;
  keywords?: ChromeAiKeywordsParams;
  categories?: ChromeAiCategoriesParams;
  decisions?: ChromeAiDecisionsParams;
}

declare module './rtdModule/spec' {
  interface ProviderConfig {
    chromeAi: {
      params?: ChromeAiRtdParams;
    };
  }
}

export {};
