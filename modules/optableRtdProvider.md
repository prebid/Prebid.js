# Optable RTD Submodule

## Overview

    Module Name: Optable RTD Provider
    Module Type: RTD Provider
    Maintainer: prebid@optable.co

## Minimal Prebid.js Versions

Prebid.js minimum version: 9.53.2+, or 10.2+

## Description

Optable RTD submodule enriches the OpenRTB bid request by populating `user.ext.eids` and `user.data` using an identity graph and audience segmentation service hosted by Optable on behalf of the publisher.

**This module supports TWO modes of operation with automatic detection:**

### Mode 1: Web SDK Mode (Recommended for ad server targeting)

Uses Optable Web SDK loaded on page via event-based integration.

**Setup:**
- Load Optable Web SDK: `<script src="[Bundle URL]"></script>`
- Configure RTD module with optional params only

**Features:**
- Bid request enrichment (EIDs passed to SSPs)
- Ad server targeting (key-values for GAM/other ad servers)
- Event-based (waits for 'optable-targeting:change' event)
- SDK handles API calls, consent, caching, etc.

### Mode 2: Direct API Mode (Lightweight, SDK-less)

Makes direct HTTP calls to Optable targeting API without any external SDK.

**Setup:**
- No SDK required - module makes direct HTTPS GET requests
- Configure RTD module with host, node, site parameters

**Features:**
- Bid request enrichment (EIDs passed to SSPs)
- NO ad server targeting (use SDK mode for this)
- Cache-first with fallback strategy (fast page loads)
- Consent from Prebid's userConsent parameter (no CMP calls)
- Timeout derived from auctionDelay (automatic)

### Mode Detection

The module automatically detects which mode to use at runtime:
1. **First:** Checks if `window.optable[instance]` is present → **SDK mode** (Direct API params ignored)
2. **Second:** If SDK absent but `host`/`node`/`site` configured → **Direct API mode**
3. **Otherwise:** Error (neither mode available)

**Important:** If the Optable Web SDK is loaded on the page, the module will always use SDK mode, even if Direct API parameters (`host`, `node`, `site`) are configured. The Direct API parameters are only used when the SDK is not present.

## Usage

### Integration

Compile the Optable RTD Module with other modules and adapters into your Prebid.js build:

```bash
gulp build --modules="rtdModule,optableRtdProvider,appnexusBidAdapter,..."
```

> Note that Optable RTD module is dependent on the global real-time data module, `rtdModule`.

### Configuration

This module is configured as part of the `realTimeData.dataProviders`.

**SDK Mode Configuration (with Optable Web SDK loaded):**

```javascript
// Load SDK first in your page:
// <script src="[Bundle URL]"></script>

pbjs.setConfig({
  debug: true,
  realTimeData: {
    auctionDelay: 200,
    dataProviders: [
      {
        name: 'optable',
        waitForIt: true,
        params: {
          adserverTargeting: true,  // Enable ad server targeting
          instance: 'instance'       // SDK instance name (default: 'instance')
        },
      },
    ],
  },
});
```

**Direct API Mode Configuration (SDK-less):**

```javascript
pbjs.setConfig({
  debug: true, // we recommend turning this on for testing as it adds more logging
  realTimeData: {
    auctionDelay: 200, // recommended for real-time data
    dataProviders: [
      {
        name: 'optable',
        waitForIt: true,
        params: {
          host: 'dcn.customer.com',  // REQUIRED: Your Optable DCN hostname
          node: 'prod-us',            // REQUIRED: Your node identifier
          site: 'my-site',            // REQUIRED: Your site identifier
        },
      },
    ],
  },
});
```

**Advanced Configuration:**

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 200,
    dataProviders: [
      {
        name: 'optable',
        waitForIt: true,
        params: {
          // REQUIRED PARAMETERS:
          host: 'dcn.customer.com',       // Your Optable DCN hostname
          node: 'prod-us',                 // Your node identifier
          site: 'my-site',                 // Your site identifier

          // OPTIONAL PARAMETERS:
          cookies: false,                  // Set to false for cookieless mode (default: true)
          timeout: '500ms',                // API timeout hint
          ids: ['user-id-1', 'user-id-2'], // User identifiers (also auto-extracted from userId module)
          hids: ['hint-id'],               // Hint identifiers

          // CUSTOM HANDLER (optional):
          handleRtd: (reqBidsConfigObj, targetingData, mergeFn) => {
            // Custom logic to handle targeting data
            console.log('Custom RTD handler called');
            console.log('Targeting data:', targetingData);

            // Perform any custom processing here

            // Merge the data into bid requests
            mergeFn(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2);
          }
        },
      },
    ],
  },
});
```

### Parameters

| Name              | Type     | Description                                                                                                                                                                                                                              | Default | Required | Mode |
|-------------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|----------|------|
| name              | String   | Real time data module name                                                                                                                                                                                                               | Always `optable` | Yes | Both |
| waitForIt         | Boolean  | Should be set to `true` to ensure targeting data is available before auction                                                                                                                                                            | `false` | Recommended | Both |
| params            | Object   | Configuration parameters                                                                                                                                                                                                                 |         | Yes | Both |
| **params.adserverTargeting** | **Boolean** | **Enable ad server targeting key-values (SDK mode only)** | **`true`** | **No** | **SDK** |
| **params.instance** | **String** | **SDK instance name** | **`'instance'`** | **No** | **SDK** |
| params.host       | String   | Your Optable DCN hostname (e.g., `dcn.customer.com`)                                                                                                                                                                                    | None    | **Yes** | Direct API |
| params.node       | String   | Node identifier for your DCN                                                                                                                                                                                                             | None    | **Yes** | Direct API |
| params.site       | String   | Site identifier configured in your DCN                                                                                                                                                                                                   | None    | **Yes** | Direct API |
| params.cookies    | Boolean  | Cookie mode. Set to `false` for cookieless targeting using passport                                                                                                                                                                     | `true`  | No | Direct API |
| params.timeout    | String   | API timeout hint (e.g., `"500ms"`)                                                                                                                                                                                                      | `null`  | No | Direct API |
| params.ids        | Array    | Array of user identifier strings in Optable format (e.g., `"e:hash"`, `"c:ppid"`, `"__passport__"`). Use this to pass Optable-specific identifiers.                                                                                    | `[]`    | No | Direct API |
| params.hids       | Array    | Array of hint identifier strings                                                                                                                                                                                                    | `[]`    | No | Direct API |
| params.handleRtd  | Function | Custom function to handle/enrich RTD data. Function signature: `(reqBidsConfigObj, targetingData, mergeFn) => {}`. If not provided, the module uses a default handler that merges targeting data into ortb2Fragments.global            | `null`  | No | Both |

## How It Works

### 1. Initialization

When Prebid's auction starts, the Optable RTD module:

1. Validates the configuration (checks for required `host`, `node`, and `site` parameters)
2. Checks for cached targeting data in localStorage
3. If no cache is found, proceeds to make an API call

### 2. Data Collection

Before calling the targeting API, the module automatically:

- Generates a session ID (once per page load)
- Extracts consent information from Prebid's consent management modules (GPP/GDPR)
- Collects user identifiers from the `ids` parameter in configuration
- Retrieves the passport (visitor ID) from localStorage for cookieless mode

**Note:** The module does NOT extract identifiers from Prebid's userId module for the targeting API call. Those identifiers are in ORTB format and are handled separately in bid requests.

### 3. API Call

The module makes a GET request to `https://{host}/v2/targeting` with the following parameters:

- `o`: Site identifier (required)
- `t`: Node identifier (required)
- `id`: User identifiers (multiple)
- `hid`: Hint identifiers (multiple)
- `osdk`: SDK version identifier
- `sid`: Session ID
- `cookies`: Cookie mode (`yes` or `no`)
- `passport`: Visitor ID for cookieless mode
- `gpp`: GPP consent string
- `gpp_sid`: GPP section IDs
- `gdpr_consent`: GDPR consent string
- `gdpr`: GDPR applies flag (`0` or `1`)
- `timeout`: Timeout hint

### 4. Response Handling

The targeting API returns an ORTB2 object with:

- `ortb2.user.eids`: Extended user IDs for bid enrichment
- `ortb2.user.data`: Audience segments
- `passport`: Updated passport value (for cookieless mode)

The module then:

1. Updates the passport in localStorage if provided
2. Caches the response in localStorage
3. Merges the ORTB2 data into `reqBidsConfigObj.ortb2Fragments.global`
4. Also adds EIDs to `ortb2.user.ext.eids` for additional coverage

### 5. Bid Enrichment

The enriched ORTB2 data is automatically included in all bid requests, allowing bidders to:

- Access extended user IDs for better user recognition
- Target based on audience segments
- Improve bid decisioning with richer user context

## Consent Management

The module automatically extracts consent information from Prebid's consent management configuration:

```javascript
// Example consent management config
pbjs.setConfig({
  consentManagement: {
    gpp: {
      // GPP consent config
    },
    gdpr: {
      // GDPR consent config
    }
  }
});
```

The consent strings are automatically passed to the targeting API. No additional configuration is needed.

## Identifier Collection

User identifiers are provided via the `ids` parameter in the RTD configuration:

```javascript
params: {
  host: 'dcn.customer.com',
  node: 'prod-us',
  site: 'my-site',
  ids: ['e:email-hash-123', 'c:phone-hash-456'],  // Optable-specific ID format
  hids: ['hint-id-789']
}
```

**Important:** The module does NOT automatically extract identifiers from Prebid's userId module (those are in ORTB format, not Optable's ID format). Optable-specific identifiers must be provided via the `ids` parameter.

**Note:** If you have Prebid userId modules configured (ID5, Unified ID, etc.), those EIDs will still be included in bid requests via the standard ORTB `user.ext.eids` path, but they are not sent to the Optable targeting API.

## Cookie vs Cookieless Mode

### Cookie Mode (Default)

```javascript
params: {
  host: 'dcn.customer.com',
  node: 'prod-us',
  site: 'my-site',
  cookies: true  // or omit this parameter
}
```

In cookie mode, the DCN uses first-party cookies for visitor identification.

### Cookieless Mode

```javascript
params: {
  host: 'dcn.customer.com',
  node: 'prod-us',
  site: 'my-site',
  cookies: false
}
```

In cookieless mode:
- The module manages a "passport" (visitor ID) in localStorage
- The passport is sent with each targeting API call
- The API returns an updated passport, which is stored for future calls
- No cookies are set or read

**Passport Storage Format:**
- Storage key: `OPTABLE_PASSPORT_{base64(host/node)}`
- Example: For `host="dcn.customer.com"` and `node="prod-us"`, the key is `OPTABLE_PASSPORT_` + base64 encoded `"dcn.customer.com/prod-us"`
- This format is compatible with the Optable Web SDK, allowing seamless migration between Direct API mode and SDK mode

## Caching

The module caches targeting responses in localStorage to improve page load performance:

**Cache Key:** `optable-cache:targeting`

**Cache Behavior:**
- **First page view (no cache):** API call is made synchronously, response is cached
- **Subsequent page views (cache present):**
  - Cached data is used immediately (no delay)
  - On first auction only: Background API call refreshes the cache
  - On subsequent auctions: No additional API calls (already refreshed)
- **Cache validity:** Cache is used if it contains EIDs (`user.eids.length > 0`) OR has a `split_test_assignment` field

**Cache Invalidation:**
- The cache is replaced (not merged) on each successful API response
- If an API call returns an empty response or fails, the existing cache is preserved
- No automatic TTL-based expiry (cache persists until next successful API response)

**Empty Response Handling:**
- If the API returns 0 EIDs and no `split_test_assignment`, the cache is **not** updated
- This prevents temporary API issues from clearing valid cached data

## Node Configuration

The `node` parameter is required and identifies your DCN node:

```javascript
params: {
  host: 'dcn.customer.com',
  node: 'prod-us',  // Your node identifier
  site: 'my-site'
}
```

The node identifier routes the API call to the specified node and maintains separate passports per node.

## Custom RTD Handler

For advanced use cases, provide a custom `handleRtd` function:

```javascript
params: {
  host: 'dcn.customer.com',
  node: 'prod-us',
  site: 'my-site',
  handleRtd: (reqBidsConfigObj, targetingData, mergeFn) => {
    console.log('Targeting data received:', targetingData);

    // Custom validation
    if (!targetingData || !targetingData.ortb2) {
      console.warn('Invalid targeting data');
      return;
    }

    // Custom transformation
    const customOrtb2 = {
      user: {
        ...targetingData.ortb2.user,
        ext: {
          ...targetingData.ortb2.user.ext,
          customField: 'customValue'
        }
      }
    };

    // Merge into bid requests
    mergeFn(reqBidsConfigObj.ortb2Fragments.global, customOrtb2);

    // Additional custom logic...
  }
}
```

## Testing

Use Prebid's debug mode to see detailed logs:

```javascript
pbjs.setConfig({
  debug: true,
  // ... rest of config
});
```

Logs will show:
- Configuration validation
- API call details
- Consent extraction
- Identifier collection
- Caching behavior
- Data merging into bid requests

## Example

To see a working example:

```bash
gulp serve --modules=optableRtdProvider,consentManagementGpp,consentManagementTcf,appnexusBidAdapter
```

Then open:

[`http://localhost:9999/integrationExamples/gpt/optableRtdProvider_example.html`](http://localhost:9999/integrationExamples/gpt/optableRtdProvider_example.html)

Open the browser console to see the logs.

## Migration from External Web SDK Approach

If you were previously using an external Web SDK loaded via `bundleUrl` parameter:

### Old Configuration (External Web SDK):
```javascript
params: {
  bundleUrl: 'https://cdn.optable.co/bundle.js',
  adserverTargeting: true
}
```

### New Configuration (Direct API):
```javascript
params: {
  host: 'dcn.customer.com',  // Your DCN hostname
  node: 'prod-us',           // Your node identifier
  site: 'my-site'            // Your site identifier
}
```

### Key Differences:

1. **No External Loading**: Module no longer loads SDK from CDN, uses direct API calls instead
2. **Required Parameters**: `host`, `node`, and `site` are now required
3. **Ad Server Targeting**: Not supported. Use the Web SDK separately if you need GAM targeting keywords
4. **Custom Handler Signature**: Changed from `(reqBidsConfigObj, optableExtraData, mergeFn, skipCache)` to `(reqBidsConfigObj, targetingData, mergeFn)`
5. **Faster**: No external script loading delay
6. **Simpler**: Fewer dependencies and configuration options

## Excluded Features

The following Web SDK features are intentionally **not** supported in this RTD module to maintain simplicity:

- Client-side A/B testing / traffic splitting framework (server-side split test assignment from DCN is supported via `split_test_assignment` field)
- Additional targeting signals (page URL ref)
- Ad server targeting keywords (use Web SDK for this)
- Event dispatching system
- Complex multi-storage key strategies

**Note:** Server-side split testing is supported. If the targeting API returns a `split_test_assignment` field (e.g., "test" or "control"), it will be injected into `ortb2Imp.ext.optable.splitTestAssignment` for all ad units.

See `modules/optableRtdProvider_EXCLUDED_FEATURES.md` for details.

## Troubleshooting

### "host parameter is required and must be a string"

Ensure you've configured the `host` parameter:

```javascript
params: {
  host: 'dcn.customer.com',  // Required!
  node: 'prod-us',
  site: 'my-site'
}
```

### "site parameter is required and must be a string"

Ensure you've configured the `site` parameter:

```javascript
params: {
  host: 'dcn.customer.com',
  node: 'prod-us',
  site: 'my-site'  // Required!
}
```

### "node parameter is required and must be a string"

Ensure you've configured the `node` parameter:

```javascript
params: {
  host: 'dcn.customer.com',
  node: 'prod-us',  // Required!
  site: 'my-site'
}
```

### No targeting data returned

Check:
1. Is `waitForIt: true` set in the dataProvider config?
2. Is `auctionDelay` set appropriately (e.g., 200ms)?
3. Are there identifiers available (check `ids` param and userId module)?
4. Check browser console for API errors
5. Verify your DCN host, node and site identifier are correct

### Consent issues

Ensure Prebid's consent management modules are configured:

```javascript
pbjs.setConfig({
  consentManagement: {
    gdpr: { ... },
    gpp: { ... }
  }
});
```

## Maintainer Contacts

Any suggestions or questions can be directed to [prebid@optable.co](mailto:prebid@optable.co).

Alternatively please open a new [issue](https://github.com/prebid/Prebid.js/issues/new) or [pull request](https://github.com/prebid/Prebid.js/pulls) in this repository.
