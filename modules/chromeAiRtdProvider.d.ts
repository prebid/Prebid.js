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

export interface ChromeAiSummarizerParams {
  /**
   * Generates keywords with the Summarizer API. Ignored when `keywords.enabled` is `true`: the Summarizer is then
   * only the fallback for keywords, with the options below. Defaults to `false`.
   */
  enabled?: boolean;
  /** Summarizer `type`, e.g. `'headline'`, `'key-points'`, `'tldr'` or `'teaser'`. Defaults to `'headline'`. */
  type?: string;
  /** Summarizer `format`, `'markdown'` or `'plain-text'`. Defaults to `'markdown'`. */
  format?: string;
  /** Summarizer `length`, `'short'`, `'medium'` or `'long'`. Defaults to `'short'`. */
  length?: string;
  /** Path of the keywords array. Defaults to `'site.content.keywords'`. */
  ortb2Path?: string;
  /** Defaults to `true`. */
  cacheInLocalStorage?: boolean;
}

export interface ChromeAiKeywordsParams {
  /** Extracts keywords with the Prompt API, falling back to the Summarizer API. Defaults to `false`. */
  enabled?: boolean;
  /** Defaults to `10`. */
  maxKeywords?: number;
  /**
   * Defaults to `'site.content.keywords'`, which gets a comma-separated string. A path ending in `kwarray` gets an array.
   */
  ortb2Path?: string;
  /** Defaults to `true`. */
  cacheInLocalStorage?: boolean;
}

export interface ChromeAiCategoriesParams {
  /**
   * Classifies the page into IAB Content Taxonomy 3.1 categories with the Classifier API, written to `site.pagecat`
   * with `site.cattax` 9. Defaults to `false`.
   */
  enabled?: boolean;
  /** Minimum score (0 - 1) of a category. Defaults to `0.5`. */
  minScore?: number;
  /** Defaults to `3`. */
  maxCategories?: number;
  /**
   * Falls back to the Prompt API, which picks from the tier 1 categories, when the Classifier API is unavailable.
   * Defaults to `false`.
   */
  promptFallback?: boolean;
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
  /** Falls back to the Prompt API when the Decisions API is unavailable. Defaults to `true`. */
  promptFallback?: boolean;
  /** Defaults to `true`. */
  cacheInLocalStorage?: boolean;
}

export interface ChromeAiRtdParams {
  languageDetector?: ChromeAiLanguageDetectorParams;
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
