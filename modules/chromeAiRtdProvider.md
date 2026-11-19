# Chrome AI RTD Provider

## Overview

The Chrome AI RTD Provider is a Prebid.js Real-Time Data (RTD) module that adds first party data about the page using Chrome's built-in, on-device AI APIs. Page text never leaves the browser. It can:

- detect the page language with the [Language Detector API](https://developer.chrome.com/docs/ai/language-detection), written to `site.content.language`;
- extract keywords with the [Prompt API](https://github.com/webmachinelearning/prompt-api) (`LanguageModel`), written to `site.content.keywords`;
- classify the page into tier 1 categories of IAB Content Taxonomy 2.2 or Content Category Taxonomy 1.0 with the Prompt API, written to `site.pagecat`. With Content Taxonomy 2.2, the categories also reach Google Ad Manager as Publisher Provided Signals (`IAB_CONTENT_2_2`) through the `gptPreAuction` module, with no extra setup beyond GPT targeting;
- answer publisher-defined questions about the page with the [Decisions API](https://github.com/explainers-by-googlers/decisions-api) (`DecisionModel`), falling back to the Prompt API, written to `site.content.data`.

## API availability

| API | Used for | Status |
|-----|----------|--------|
| Language Detector | `languageDetector` | Chrome 138+ stable |
| Prompt API (`LanguageModel`) | `keywords`, `categories`, `decisions` fallback | Chrome 148+ stable on the web |
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
          taxonomy: 6
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
| `keywords.enabled` | Boolean | Extract keywords with the Prompt API | `false` |
| `keywords.maxKeywords` | Number | Maximum number of keywords | `10` |
| `keywords.prompt` | String | Replaces the default instruction, see [Custom prompts](#custom-prompts) | |
| `keywords.ortb2Path` | String | Where to write the keywords: a comma-separated string, or an array when the path ends in `kwarray` | `'site.content.keywords'` |
| `keywords.cacheInLocalStorage` | Boolean | Cache the keywords in localStorage | `true` |
| `categories.enabled` | Boolean | Classify the page into IAB tier 1 categories with the Prompt API | `false` |
| `categories.taxonomy` | Number | AdCOM `cattax` of the categories: `6` (Content Taxonomy 2.2) or `1` (Content Category Taxonomy 1.0) | `6` |
| `categories.minScore` | Number | Minimum confidence the model gives a category (0 - 1) | `0.5` |
| `categories.maxCategories` | Number | Maximum number of categories | `3` |
| `categories.prompt` | String | Replaces the default instruction, see [Custom prompts](#custom-prompts) | |
| `categories.gamPps` | Boolean | With taxonomy 6, also send the categories to Google Ad Manager as Publisher Provided Signals, see [Google Ad Manager](#google-ad-manager-publisher-provided-signals) | `true` |
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

The Prompt API returns up to `maxKeywords` keywords through a JSON schema `responseConstraint`. The result is written to `keywords.ortb2Path` as a comma-separated string, which is the OpenRTB type of `keywords`, or as an array for a `kwarray` path.

The module no longer uses the Summarizer API: it runs on the same on-device model as the Prompt API, and its one-sentence summary made a poor keyword. `summarizer` params log a warning. `summarizer.enabled: true` turns on `keywords` instead (unless `keywords.enabled` is set), with `summarizer.ortb2Path` and `summarizer.cacheInLocalStorage` if `keywords` doesn't set them; the other `summarizer` options are ignored. The keywords are now written as a comma-separated string rather than an array of one summary, unless the path ends in `kwarray`.

### Categories (`categories`)

The Prompt API classifies the page into tier 1 categories of the configured taxonomy, each with a confidence. A JSON schema `responseConstraint` limits its answers to the bundled IDs, and the module drops any other ID. It keeps the IDs with a confidence of at least `minScore`, highest first, up to `maxCategories`, and writes them to `site.pagecat`. It sets `site.cattax` to the taxonomy only when the auction has no `site.cattax`.

The bundled tier 1 lists come from the IAB Tech Lab taxonomy files:

- `taxonomy: 6`, Content Taxonomy 2.2: the 29 topical categories, with numeric IDs from 1 to 680. IDs above 680 are never used. The file's other parentless rows are left out: Sensitive Topics (`v9i3On`), Brand Suitability and Risk (`MRkz4Q`), and the Content Channel, Type, Source, Media Format, Language and Source Geo extension dimensions (1000 - 1219).
- `taxonomy: 1`, Content Category Taxonomy 1.0: `IAB1` - `IAB23`. `IAB24` Uncategorized, `IAB25` Non-Standard Content and `IAB26` Illegal Content are left out because they aren't page topics.

#### Google Ad Manager Publisher Provided Signals

With `taxonomy: 6`, the categories are also added to `site.content.data` as an entry with `ext.segtax: 6`:

```javascript
{ name: 'chromeAi', ext: { segtax: 6 }, segment: [{ id: '1' }, { id: '640' }] }
```

The `gptPreAuction` module, which is on by default when it is in the build, sends segtax 6 entries to GPT as the `IAB_CONTENT_2_2` Publisher Provided Signals when targeting is set with `setTargetingForGPTAsync`. This module never calls `googletag` itself. The entry is added even when the publisher's own `site.pagecat` is kept, but not when `site.content.data` already has a segtax 6 `chromeAi` entry.

```bash
gulp build --modules=rtdModule,chromeAiRtdProvider,gptPreAuction
```

```javascript
pbjs.setConfig({
  realTimeData: {
    dataProviders: [{
      name: 'chromeAi',
      params: {
        categories: { enabled: true } // taxonomy 6 and gamPps are the defaults
      }
    }]
  }
});
// later, after the auction:
pbjs.setTargetingForGPTAsync();
```

Set `categories.gamPps: false` to keep the categories out of `site.content.data` and GAM. Google Ad Manager has no Publisher Provided Signals taxonomy for Content Category Taxonomy 1.0, so `taxonomy: 1` never adds this entry: use 2.2 for GAM.

The module doesn't use the [Classifier API](https://github.com/explainers-by-googlers/classifier-api): its explainer says it is no longer pursued.

Categories are not written when the auction already has `site.pagecat`, or when the publisher's site categories are in another taxonomy than `categories.taxonomy`: a different `site.cattax`, or, for taxonomy 6, `site.cat` or `site.sectioncat` without `site.cattax` (which OpenRTB reads as taxonomy 1). When they match, `site.pagecat` is added next to the publisher's categories. `site.cattax` also describes `site.cat` and `site.sectioncat`, so it can't be changed.

### Custom prompts

`keywords.prompt` and `categories.prompt` replace the module's default instruction. The module still adds the rest:

- for categories, the tier 1 category list (`ID: name` lines) and then the page text;
- for keywords, the page text.

The Prompt API's `responseConstraint` still applies, so a custom prompt can't produce IDs outside the taxonomy list, more than `maxCategories` or `maxKeywords` results, or another response shape. A prompt that isn't a non-empty string is ignored with a warning, and the default is used. Changing the prompt refreshes cached results.

```javascript
categories: {
  enabled: true,
  prompt: 'Pick the categories that best describe the main subject of this recipe site page, ignoring navigation and ads.'
}
```

### Publisher questions (`decisions`)

`decisions.questions` uses the question shape of the Decisions API schema:

| Field | Description |
|-------|-------------|
| `id` | Question name, used as the segment `id` |
| `type` | `'boolean'`, `'choice'` or `'score'` |
| `prompt` | The question |
| `options` | `[{ label, description }]`. Required for `choice`; optional for `score`, where it defaults to `'1'` - `'5'`. `boolean` answers are `'true'` or `'false'` |

The Decisions API answers all questions in one pass. Answers with a confidence below `minConfidence` are dropped. When `DecisionModel` is unavailable, the Prompt API answers instead, constrained by a JSON schema built from the same questions so that each answer is one of the question's labels; it gives no confidence, so `minConfidence` doesn't apply.

The answers are added to `site.content.data` as one entry, without `ext.segtax`, separate from the categories entry:

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

No entry is added when `site.content.data` already has a `chromeAi` entry without `ext.segtax`.

## Storage

All results are stored in localStorage under the `chromeAi_detected_data` key, as an object keyed by page URL, when storage is allowed for the module by the activity controls (for example, the `storage` activity and TCF consent).

Keywords, categories and answers are stored with a hash of the settings that shape them (`maxKeywords` and `prompt`; `taxonomy`, `minScore`, `maxCategories` and `prompt`; the questions and `minConfidence`), and detected again when those settings change.

## Requirements

- Chrome with the APIs above, on a device that meets their hardware requirements. In cross-origin iframes, the Prompt and Decisions APIs need `allow="language-model"`.
- At least 20 characters of page text.

## Limitations

- Results depend on the on-device models and the first 1000 characters of the page text.
- Categories are tier 1 only.
