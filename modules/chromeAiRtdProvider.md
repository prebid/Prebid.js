# Chrome AI RTD Provider

## Overview

The Chrome AI RTD Provider is a Prebid.js Real-Time Data (RTD) module that adds first party data about the page using Chrome's built-in, on-device AI APIs. Page text never leaves the browser. It can:

- detect the page language with the [Language Detector API](https://developer.chrome.com/docs/ai/language-detection), written to `site.content.language`;
- extract keywords with the [Prompt API](https://github.com/webmachinelearning/prompt-api) (`LanguageModel`), falling back to the [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api), written to `site.content.keywords`;
- classify the page into IAB Content Taxonomy 3.1 categories with the [Classifier API](https://github.com/explainers-by-googlers/classifier-api), optionally falling back to the Prompt API, written to `site.pagecat` with `site.cattax: 9`;
- answer publisher-defined questions about the page with the [Decisions API](https://github.com/explainers-by-googlers/decisions-api) (`DecisionModel`), falling back to the Prompt API, written to `site.content.data`.

## API availability

| API | Used for | Status |
|-----|----------|--------|
| Language Detector | `languageDetector` | Chrome 138+ stable |
| Summarizer | `summarizer`, `keywords` fallback | Chrome 138+ stable |
| Prompt API (`LanguageModel`) | `keywords`, `categories` and `decisions` fallbacks | Chrome 148+ stable on the web |
| Classifier | `categories` | Experimental explainer; the explainer says it is no longer pursued. Use `promptFallback` to get categories today |
| Decisions (`DecisionModel`) | `decisions` | Experimental explainer; its dev trial prototype is behind a flag |

Every API is feature detected: when one is missing or `unavailable`, the module uses the next one in line or skips that feature. Other browsers get no data from this module.

Only language detection is on by default. Every other feature, and every fallback that can download a model, is opt-in.

## Integration

### Build Setup

```bash
gulp build --modules=rtdModule,chromeAiRtdProvider
```

### Basic Integration

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi'
    }]
  }
});
```

### All features

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      params: {
        languageDetector: {
          enabled: true,
          confidence: 0.9
        },
        keywords: {
          enabled: true,
          maxKeywords: 10
        },
        categories: {
          enabled: true,
          minScore: 0.5,
          maxCategories: 3,
          promptFallback: true
        },
        decisions: {
          enabled: true,
          minConfidence: 0.7,
          questions: [
            { id: 'is_review', type: 'boolean', prompt: 'Is this page a product review?' },
            {
              id: 'audience',
              type: 'choice',
              prompt: 'Who is this page written for?',
              options: [
                { label: 'enthusiast', description: 'Hobbyists and experts' },
                { label: 'beginner', description: 'People new to the topic' },
                { label: 'general' }
              ]
            },
            { id: 'sentiment', type: 'score', prompt: 'Rate how positive the page is, from 1 (negative) to 5 (positive).' }
          ]
        }
      }
    }]
  }
});
```

## Configuration Options

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `languageDetector.enabled` | Boolean | Detect the page language | `true` |
| `languageDetector.confidence` | Number | Minimum confidence of the detected language (0 - 1) | `0.8` |
| `languageDetector.ortb2Path` | String | Where to write the language | `'site.content.language'` |
| `keywords.enabled` | Boolean | Extract keywords with the Prompt API, falling back to the Summarizer | `false` |
| `keywords.maxKeywords` | Number | Maximum number of keywords | `10` |
| `keywords.ortb2Path` | String | Where to write the keywords: a comma-separated string, or an array when the path ends in `kwarray` | `'site.content.keywords'` |
| `keywords.cacheInLocalStorage` | Boolean | Cache the keywords in localStorage | `true` |
| `summarizer.enabled` | Boolean | Use only the Summarizer for keywords. Ignored when `keywords.enabled` is `true` | `false` |
| `summarizer.type` | String | `'headline'`, `'key-points'`, `'tldr'` or `'teaser'` | `'headline'` |
| `summarizer.format` | String | `'plain-text'` or `'markdown'` | `'markdown'` |
| `summarizer.length` | String | `'short'`, `'medium'` or `'long'` | `'short'` |
| `summarizer.ortb2Path` | String | Where to write the summary, as an array of one string | `'site.content.keywords'` |
| `summarizer.cacheInLocalStorage` | Boolean | Cache the summary in localStorage | `true` |
| `categories.enabled` | Boolean | Classify the page into IAB Content Taxonomy 3.1 categories | `false` |
| `categories.minScore` | Number | Minimum score of a category (0 - 1) | `0.5` |
| `categories.maxCategories` | Number | Maximum number of categories | `3` |
| `categories.promptFallback` | Boolean | Use the Prompt API when the Classifier API is unavailable | `false` |
| `categories.cacheInLocalStorage` | Boolean | Cache the categories in localStorage | `true` |
| `decisions.enabled` | Boolean | Answer `decisions.questions` about the page | `false` |
| `decisions.questions` | Array | Questions in the Decisions API schema shape, see below | `[]` |
| `decisions.minConfidence` | Number | Drop Decisions API answers with a lower confidence (0 - 1) | `0` |
| `decisions.promptFallback` | Boolean | Use the Prompt API when the Decisions API is unavailable | `true` |
| `decisions.cacheInLocalStorage` | Boolean | Cache the answers in localStorage | `true` |

## How It Works

On `init`, each enabled feature first looks for a result cached in localStorage for the current page URL. Otherwise it reads the page text (truncated to 1000 characters to stay within the APIs' input quotas), checks which API is available and runs it. The auction never waits for this: `getBidRequestData` adds whatever results are ready, and results that arrive later are used by later auctions and page views.

Values the publisher already set in the auction's first party data are never overwritten.

### Model downloads and user activation

Chrome only downloads a model when the page has transient user activation. When the API a feature would use reports `downloadable` or `downloading` and the user hasn't interacted with the page, the feature waits for the next click, key press or tap and tries again. Language detection keeps its original behaviour and doesn't wait.

### Language (`languageDetector`)

The top language detected with at least `confidence` is written to `languageDetector.ortb2Path`. It is always cached in localStorage.

### Keywords (`keywords`)

The Prompt API returns up to `maxKeywords` keywords through a JSON schema `responseConstraint`. When `LanguageModel` is unavailable, the Summarizer (with the `summarizer` options) is used and its summary becomes a single keyword. The result is written to `keywords.ortb2Path` as a comma-separated string, which is the OpenRTB type of `keywords`, or as an array for a `kwarray` path.

Configurations that only set `summarizer.enabled: true` keep their behaviour: only the Summarizer runs, and the summary is written as an array of one string.

### Categories (`categories`)

The Classifier API returns IAB Content Taxonomy 3.1 unique IDs with scores. The module keeps the IDs scoring at least `minScore`, highest first, up to `maxCategories`, and writes them to `site.pagecat` with `site.cattax: 9` (IAB Content Taxonomy 3.1 in the AdCOM list).

With `promptFallback: true`, the Prompt API is used when the Classifier API is unavailable. It may only answer with the tier 1 categories of the taxonomy, enforced by the response constraint, with a self-reported confidence that `minScore` applies to. The fallback is opt-in because it downloads a much larger model and only knows tier 1.

Categories are not written when the auction already has `site.pagecat`, or when the publisher's site categories are in another taxonomy: a `site.cattax` other than 9, or `site.cat` or `site.sectioncat` without `site.cattax` (which OpenRTB reads as taxonomy 1). `site.cattax` also describes `site.cat` and `site.sectioncat`, so it can't be changed.

### Publisher questions (`decisions`)

`decisions.questions` uses the question shape of the Decisions API schema:

| Field | Description |
|-------|-------------|
| `id` | Question name, used as the segment `id` |
| `type` | `'boolean'`, `'choice'` or `'score'` |
| `prompt` | The question |
| `options` | `[{ label, description }]`. Required for `choice`; optional for `score`, where it defaults to `'1'` - `'5'`. `boolean` answers are `'true'` or `'false'` |

The Decisions API answers all questions in one pass. Answers with a confidence below `minConfidence` are dropped. When `DecisionModel` is unavailable, the Prompt API answers instead, constrained by a JSON schema built from the same questions so that each answer is one of the question's labels; it gives no confidence, so `minConfidence` doesn't apply.

The answers are added to `site.content.data` as one entry:

```javascript
{
  name: 'chromeAi',
  segment: [
    { id: 'is_review', value: 'true' },
    { id: 'audience', value: 'enthusiast' },
    { id: 'sentiment', value: '4' }
  ]
}
```

No entry is added when `site.content.data` already has one named `chromeAi`.

## Storage

All results are stored in localStorage under the `chromeAi_detected_data` key, as an object keyed by page URL, when storage is allowed for the module by the activity controls (for example, the `storage` activity and TCF consent).

Keywords, categories and answers are stored with a hash of the settings that shape them (`maxKeywords`; `minScore` and `maxCategories`; the questions and `minConfidence`), and detected again when those settings change.

## Requirements

- Chrome with the APIs above, on a device that meets their hardware requirements. In cross-origin iframes, the Prompt and Decisions APIs need `allow="language-model"`.
- At least 20 characters of page text.

## Limitations

- Results depend on the on-device models and the first 1000 characters of the page text.
- The Classifier explainer only covers English.
- The Prompt API category fallback only returns tier 1 categories.
