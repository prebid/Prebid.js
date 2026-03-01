# Overview

**Module Name:** Paywalls Analytics Adapter

**Module Type:** Analytics Adapter

**Maintainer:** [engineering@paywalls.net](mailto:engineering@paywalls.net)


## Description

The Paywalls Analytics Adapter emits [VAI (Validated Actor Inventory)](https://docs.paywalls.net/publishers/vai) classification on each Prebid auction. VAI helps publishers distinguish **human traffic** and **AI agents** from **non-human automation** (sharing/preview bots, search crawlers, AI training, etc.) so they can make better-informed economic decisions.

In practice, this enables publishers to:

- **Segment and analyze performance** by traffic class (yield, fill, viewability, buyer outcomes) in their existing analytics stack (GA4, GTM / dataLayer, or a custom callback)
- **Route supply to appropriate demand** (e.g., prioritize premium demand paths for higher-confidence human traffic, apply different floors/controls to lower-confidence or non-human traffic)

This can improve monetization efficiency and help buyers receive inventory that matches their quality requirements.

Two key-value pairs are emitted per auction:

| Key       | Example Value | Description                                                  |
|-----------|---------------|--------------------------------------------------------------|
| `vai_vat` | `HUMAN`       | Validated Actor Type — one of `HUMAN`, `AI_AGENT`, `SHARING`, `OTHER`  |
| `vai_act` | `ACT-1`       | Actor Confidence Tier — one of `ACT-1`, `ACT-2`, `ACT-3`   |

If VAI is unavailable (script failed to load, timed out, or returned an invalid response), both values are `UNKNOWN`.

> **No bid-level aggregation is performed.** The companion [Paywalls RTD Provider](paywallsRtdProvider.md) injects VAI into ORTB2 (`site.ext.vai`, `user.ext.vai`) and GAM targeting (`vai_vat`, `vai_act`), so SSPs, DSPs, GAM, and warehouse pipelines already have the signals needed to aggregate natively. The analytics adapter simply confirms classification is reaching the page and routes it to the publisher's analytics tool of choice.

## Build Instructions

```sh
gulp build --modules=rtdModule,paywallsRtdProvider,paywallsAnalyticsAdapter
```

The RTD provider is not strictly required, but is recommended — it handles ORTB2 enrichment and GAM targeting. The analytics adapter independently reads the same `window.__PW_VAI__` global.

## Configuration

```javascript
pbjs.enableAnalytics([{
  provider: 'paywalls',
  options: {
    output: 'callback',         // 'gtag' | 'dataLayer' | 'callback'
    scriptUrl: '/pw/vai.js',    // VAI loader URL
    samplingRate: 1.0,          // 0.0–1.0
    callback: function (metrics) {
      console.log(metrics);
      // { vai_vat: 'HUMAN', vai_act: 'ACT-1' }
    }
  }
}]);
```

### Parameters

| Name                   | Type       | Scope    | Description                                            | Default          |
|------------------------|------------|----------|--------------------------------------------------------|------------------|
| `provider`             | `String`   | Required | Must be `'paywalls'`                                   | —                |
| `options`              | `Object`   | Optional | Adapter configuration                                  | `{}`             |
| `options.output`       | `String`   | Optional | Output mode: `'gtag'`, `'dataLayer'`, or `'callback'`  | `'callback'`     |
| `options.scriptUrl`    | `String`   | Optional | URL of the VAI loader script                           | `'/pw/vai.js'`   |
| `options.samplingRate` | `Number`   | Optional | Fraction of page views that emit analytics (0.0–1.0)   | `1.0`            |
| `options.callback`     | `Function` | Optional | Called with the metrics object when `output` is `'callback'` | `null`      |

### Hosting Modes

VAI supports two hosting modes for the loader script:

- **Publisher-hosted** (preferred): The script is served from the publisher's own domain via a CDN or server integration. Use the default relative path `'/pw/vai.js'`. This keeps requests same-origin, avoids CORS, and ensures the assertion's `dom` claim matches the inventory domain.
- **Paywalls-hosted**: The script is served from `https://paywalls.net/pw/vai.js`. Set `scriptUrl` to the full URL. This mode requires paywalls.net configuration before usage. **Note** The domain provenance claim (`dom`) will reflect `paywalls.net` rather than the inventory domain, which may affect SSP verification and buyer trust.

In both cases, `vai.js` makes a request to fetch `vai.json`, which contains the signed assertion. The publisher-hosted mode is same-origin; the Paywalls-hosted mode is cross-origin (CORS).

## Output Modes

### `gtag` — Google Analytics 4

Fires a GA4 event via the global `gtag()` function:

```javascript
gtag('event', 'vai_auction', { vai_vat: 'HUMAN', vai_act: 'ACT-1' });
```

Requires the GA4 snippet (`gtag.js`) to be loaded on the page.

### `dataLayer` — Google Tag Manager

Pushes to the GTM `dataLayer` array:

```javascript
window.dataLayer.push({
  event: 'vai_auction',
  vai_vat: 'HUMAN',
  vai_act: 'ACT-1'
});
```

The array is created automatically if it does not exist. In GTM, create a Custom Event trigger on `vai_auction` to route the data to any tag.

### `callback` — Custom Function

Calls the provided function with the metrics object:

```javascript
callback({ vai_vat: 'HUMAN', vai_act: 'ACT-1' });
```

Use this for custom pipelines, data warehouses, or any destination not covered by the built-in modes.

## Sampling

Set `samplingRate` to a value between `0.0` and `1.0` to control cost. The decision is made once per page load — all auctions on that page either emit or don't.

```javascript
options: { samplingRate: 0.1 }  // emit on ~10% of page views
```

## De-duplication

The adapter emits **once per auction ID**. If Prebid fires multiple `AUCTION_END` events for the same auction (e.g. due to race conditions), only the first is processed.

## Activity Controls

The adapter uses `loadExternalScript` to inject `vai.js`. If your activity configuration restricts external scripts, allow the `paywalls` component:

```javascript
pbjs.setConfig({
  allowActivities: {
    loadExternalScript: {
      default: false,
      rules: [{
        condition: function (params) {
          return params.componentName === 'paywalls';
        },
        allow: true
      }]
    }
  }
});
```

## Privacy

- **No user identifiers**: VAI does not collect, store, or transmit user IDs, cookies, or fingerprints.
- **No PII**: The classification is based on aggregate session-level behavioral signals, not personal data.
- **Browser-side only**: All signal extraction runs in the browser; no data leaves the page except the classification result.
- **Signed assertions**: SSPs can independently verify the `assertion_jws` via the JWKS endpoint pulled from the JWS header (typically `https://example.com/pw/jwks.json`), ensuring the classification has not been tampered with.

## Testing

Run unit tests:

```sh
gulp test --nolint --file test/spec/modules/paywallsAnalyticsAdapter_spec.js
```

Run the integration test page:

```sh
gulp serve-fast --modules=rtdModule,paywallsRtdProvider,paywallsAnalyticsAdapter,appnexusBidAdapter
# Open http://localhost:9999/integrationExamples/gpt/paywallsAnalyticsAdapter_example.html
# Append ?real  to test with real VAI (requires cloud-api on :8080)
# Append ?degrade  to test graceful degradation (VAI unavailable)
```

## Links

- [VAI Documentation](https://docs.paywalls.net/publishers/vai)
- [Paywalls RTD Provider](paywallsRtdProvider.md)
- [Prebid Analytics Adapter Documentation](https://docs.prebid.org/dev-docs/integrate-with-the-prebid-analytics-api.html)
