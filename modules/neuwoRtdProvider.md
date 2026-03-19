# Overview

    Module Name: Neuwo Rtd Provider
    Module Type: Rtd Provider
    Maintainer: Grzegorz Malisz (grzegorz.malisz@neuwo.ai)

## Description

The Neuwo RTD provider fetches real-time contextual data from the Neuwo API. When installed, the module retrieves IAB content and audience categories relevant to the current page's content.

This data is then added to the bid request by populating the OpenRTB 2.x objects `ortb2.site.content.data` (for IAB Content Taxonomy) and `ortb2.user.data` (for IAB Audience Taxonomy). This enrichment allows bidders to leverage Neuwo's contextual analysis for more precise targeting and decision-making.

Here is an example scheme of the data injected into the `ortb2` object by our module:

```javascript
ortb2: {
  site: {
    content: {
      // IAB Content Taxonomy data is injected here
      data: [{
        name: "www.neuwo.ai",
        segment: [{
            id: "274",
            name: "Home & Garden",
          },
          {
            id: "42",
            name: "Books and Literature",
          },
          {
            id: "210",
            name: "Food & Drink",
          },
        ],
        ext: {
          segtax: 7,
        },
      }, ],
    },
  },
  user: {
    // IAB Audience Taxonomy data is injected here
    data: [{
      name: "www.neuwo.ai",
      segment: [{
          id: "49",
          name: "Demographic | Gender | Female |",
        },
        {
          id: "161",
          name: "Demographic | Marital Status | Married |",
        },
        {
          id: "6",
          name: "Demographic | Age Range | 30-34 |",
        },
      ],
      ext: {
        segtax: 4,
      },
    }, ],
  },
}
```

To get started, you can generate your API token at [https://neuwo.ai/generatetoken/](https://neuwo.ai/generatetoken/), send us an email to [neuwo-helpdesk@neuwo.ai](mailto:neuwo-helpdesk@neuwo.ai) or [contact us here](https://neuwo.ai/contact-us/).

## Configuration

> **Important:** You must add the domain (origin) where Prebid.js is running to the list of allowed origins in Neuwo Edge API configuration. If you have problems, send us an email to [neuwo-helpdesk@neuwo.ai](mailto:neuwo-helpdesk@neuwo.ai) or [contact us here](https://neuwo.ai/contact-us/).

This module is configured as part of the `realTimeData.dataProviders` object.

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 500, // Value can be adjusted based on the needs
    dataProviders: [
      {
        name: "NeuwoRTDModule",
        waitForIt: true,
        params: {
          neuwoApiUrl: "<Your Neuwo Edge API Endpoint URL>",
          neuwoApiToken: "<Your Neuwo API Token>",
          iabContentTaxonomyVersion: "3.0",
          enableCache: true, // Default: true. Caches API responses to avoid redundant requests
        },
      },
    ],
  },
});
```

**Parameters**

| Name                                | Type     | Required | Default | Description                                                                                                                                                                                                                                                                                                                |
| :---------------------------------- | :------- | :------- | :------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                              | String   | Yes      |         | The name of the module, which is `NeuwoRTDModule`.                                                                                                                                                                                                                                                                         |
| `params`                            | Object   | Yes      |         | Container for module-specific parameters.                                                                                                                                                                                                                                                                                  |
| `params.neuwoApiUrl`                | String   | Yes      |         | The endpoint URL for the Neuwo Edge API.                                                                                                                                                                                                                                                                                   |
| `params.neuwoApiToken`              | String   | Yes      |         | Your unique API token provided by Neuwo.                                                                                                                                                                                                                                                                                   |
| `params.iabContentTaxonomyVersion`  | String   | No       | `'3.0'` | Specifies the version of the IAB Content Taxonomy to be used. Supported values: `'2.2'`, `'3.0'`.                                                                                                                                                                                                                          |
| `params.enableCache`                | Boolean  | No       | `true`  | If `true`, caches API responses to avoid redundant requests for the same page during the session. Set to `false` to disable caching and make a fresh API call on every bid request.                                                                                                                                        |
| `params.stripAllQueryParams`        | Boolean  | No       | `false` | If `true`, strips all query parameters from the URL before analysis. Takes precedence over other stripping options.                                                                                                                                                                                                        |
| `params.stripQueryParamsForDomains` | String[] | No       | `[]`    | List of domains for which to strip **all** query parameters. When a domain matches, all query params are removed for that domain and all its subdomains (e.g., `'example.com'` strips params for both `'example.com'` and `'sub.example.com'`). This option takes precedence over `stripQueryParams` for matching domains. |
| `params.stripQueryParams`           | String[] | No       | `[]`    | List of specific query parameter names to strip from the URL (e.g., `['utm_source', 'fbclid']`). Other parameters are preserved. Only applies when the domain does not match `stripQueryParamsForDomains`.                                                                                                                 |
| `params.stripFragments`             | Boolean  | No       | `false` | If `true`, strips URL fragments (hash, e.g., `#section`) from the URL before analysis.                                                                                                                                                                                                                                     |

### API Response Caching

By default, the module caches API responses during the page session to optimise performance and reduce redundant API calls. This behaviour can be disabled by setting `enableCache: false` if needed for dynamic content scenarios.

### URL Cleaning Options

The module provides optional URL cleaning capabilities to strip query parameters and/or fragments from the analysed URL before sending it to the Neuwo API. This can be useful for privacy, caching, or analytics purposes.

**Example with URL cleaning:**

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 500, // Value can be adjusted based on the needs
    dataProviders: [
      {
        name: "NeuwoRTDModule",
        waitForIt: true,
        params: {
          neuwoApiUrl: "<Your Neuwo Edge API Endpoint URL>",
          neuwoApiToken: "<Your Neuwo API Token>",
          iabContentTaxonomyVersion: "3.0",

          // Option 1: Strip all query parameters from the URL
          stripAllQueryParams: true,

          // Option 2: Strip all query parameters only for specific domains
          // stripQueryParamsForDomains: ['example.com', 'another-domain.com'],

          // Option 3: Strip specific query parameters by name
          // stripQueryParams: ['utm_source', 'utm_campaign', 'fbclid'],

          // Optional: Strip URL fragments (hash)
          stripFragments: true,
        },
      },
    ],
  },
});
```

## Local Development

Install the exact versions of packages specified in the lockfile:

```bash
npm ci
```

> **Linux** Linux might require exporting the following environment variable before running the commands below:
> `export CHROME_BIN=/usr/bin/chromium`

You can run a local development server with the Neuwo module and a test bid adapter using the following command:

```bash
npx gulp serve --modules=rtdModule,neuwoRtdProvider,appnexusBidAdapter
```

For a faster build without tests:

```bash
npx gulp serve-fast --modules=rtdModule,neuwoRtdProvider,appnexusBidAdapter
```

After starting the server, you can access the example page at:
[http://localhost:9999/integrationExamples/gpt/neuwoRtdProvider_example.html](http://localhost:9999/integrationExamples/gpt/neuwoRtdProvider_example.html)

### Add development tools if necessary

If you don't have gulp-cli installed globally, run the following command in your Prebid.js source folder:

```bash
npm i -g gulp-cli
```

## Linting

To lint the module:

```bash
npx eslint 'modules/neuwoRtdProvider.js' --cache --cache-strategy content
```

## Testing

To run the module-specific tests:

```bash
npx gulp test-only --modules=rtdModule,neuwoRtdProvider,appnexusBidAdapter --file=test/spec/modules/euwoRtdProvider_spec.js
```

Skip building, if the project has already been built:

```bash
npx gulp test-only-nobuild --file=test/spec/modules/neuwoRtdProvider_spec.js
```
