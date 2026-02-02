# Optable RTD Submodule

## Overview

    Module Name: Optable RTD Provider
    Module Type: RTD Provider
    Maintainer: prebid@optable.co

## Minimal Prebid.js Versions

Prebid.js minimum version: 9.53.2+, or 10.2+

## Description

Optable RTD submodule enriches the OpenRTB bid request by populating `user.ext.eids` and `user.data` using an identity graph and audience segmentation service hosted by Optable on behalf of the publisher.

**This RTD module calls the Optable targeting API directly**, without requiring the Optable Web SDK to be loaded on the page. The module handles:

- Direct API calls to your Optable DCN for targeting data
- Automatic consent extraction from Prebid consent modules (GPP/GDPR)
- Identifier collection from both configuration and Prebid userId module
- Passport (visitor ID) management for cookieless targeting
- Response caching in localStorage for performance
- ORTB2 data enrichment for bid requests

## Usage

### Integration

Compile the Optable RTD Module with other modules and adapters into your Prebid.js build:

```bash
gulp build --modules="rtdModule,optableRtdProvider,appnexusBidAdapter,..."
```

> Note that Optable RTD module is dependent on the global real-time data module, `rtdModule`.

### Configuration

This module is configured as part of the `realTimeData.dataProviders`.

**Basic Configuration:**

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
          site: 'my-site',            // REQUIRED: Your site identifier
          node: 'prod-us',            // REQUIRED: Your node identifier
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
          site: 'my-site',                 // Your site identifier
          node: 'prod-us',                 // Your node identifier

          // OPTIONAL PARAMETERS:
          cookies: false,                  // Set to false for cookieless mode (default: true)
          timeout: '500ms',                // API timeout hint
          ids: ['user-id-1', 'user-id-2'], // User identifiers (also auto-extracted from userId module)
          hids: ['household-id'],          // Household identifiers

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

| Name              | Type     | Description                                                                                                                                                                                                                              | Default | Required |
|-------------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|----------|
| name              | String   | Real time data module name                                                                                                                                                                                                               | Always `optable` | Yes |
| waitForIt         | Boolean  | Should be set to `true` to ensure targeting data is available before auction                                                                                                                                                            | `false` | Recommended |
| params            | Object   | Configuration parameters                                                                                                                                                                                                                 |         | Yes |
| params.host       | String   | Your Optable DCN hostname (e.g., `dcn.customer.com`)                                                                                                                                                                                    | None    | **Yes** |
| params.site       | String   | Site identifier configured in your DCN                                                                                                                                                                                                   | None    | **Yes** |
| params.node       | String   | Node identifier for your DCN                                                                                                                                                                                                             | None    | **Yes** |
| params.cookies    | Boolean  | Cookie mode. Set to `false` for cookieless targeting using passport                                                                                                                                                                     | `true`  | No |
| params.timeout    | String   | API timeout hint (e.g., `"500ms"`)                                                                                                                                                                                                      | `null`  | No |
| params.cacheFallbackTimeout | Number   | Milliseconds to wait for fresh API data before falling back to cache. When cache exists, module tries API first; if response takes longer than this timeout, cached data is used instead. Should match or be slightly less than `auctionDelay` for best results. | `150`   | No |
| params.ids        | Array    | Array of user identifier strings. These are combined with identifiers auto-extracted from Prebid userId module                                                                                                                          | `[]`    | No |
| params.hids       | Array    | Array of household identifier strings                                                                                                                                                                                                    | `[]`    | No |
| params.handleRtd  | Function | Custom function to handle/enrich RTD data. Function signature: `(reqBidsConfigObj, targetingData, mergeFn) => {}`. If not provided, the module uses a default handler that merges targeting data into ortb2Fragments.global            | `null`  | No |

## How It Works

### 1. Initialization

When Prebid's auction starts, the Optable RTD module:

1. Validates the configuration (checks for required `host`, `site`, and `node` parameters)
2. Checks for cached targeting data in localStorage
3. If no cache is found, proceeds to make an API call

### 2. Data Collection

Before calling the targeting API, the module automatically:

- Generates a session ID (once per page load)
- Extracts consent information from Prebid's consent management modules (GPP/GDPR)
- Collects user identifiers from:
  - The `ids` parameter in configuration
  - Prebid's userId module (via `ortb2.user.ext.eids`)
- Retrieves the passport (visitor ID) from localStorage for cookieless mode

### 3. API Call

The module makes a GET request to `https://{host}/v2/targeting` with the following parameters:

- `o`: Site identifier (required)
- `t`: Node identifier (required)
- `id`: User identifiers (multiple)
- `hid`: Household identifiers (multiple)
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

User identifiers are collected from two sources:

### 1. Configuration

Provide identifiers directly in the RTD configuration:

```javascript
params: {
  host: 'dcn.customer.com',
  site: 'my-site',
  node: 'prod-us',
  ids: ['email-hash-123', 'phone-hash-456'],
  hids: ['household-id-789']
}
```

### 2. Prebid userId Module

The module automatically extracts identifiers from other Prebid userId modules:

```javascript
// If you have other userId modules configured
pbjs.setConfig({
  userSync: {
    userIds: [{
      name: 'id5Id',
      params: {
        partner: 173
      }
    }, {
      name: 'unifiedId',
      params: {
        // ...
      }
    }]
  }
});
```

All identifiers are combined and sent to the targeting API.

## Cookie vs Cookieless Mode

### Cookie Mode (Default)

```javascript
params: {
  host: 'dcn.customer.com',
  site: 'my-site',
  node: 'prod-us',
  cookies: true  // or omit this parameter
}
```

In cookie mode, the DCN uses first-party cookies for visitor identification.

### Cookieless Mode

```javascript
params: {
  host: 'dcn.customer.com',
  site: 'my-site',
  node: 'prod-us',
  cookies: false
}
```

In cookieless mode:
- The module manages a "passport" (visitor ID) in localStorage
- The passport is sent with each targeting API call
- The API returns an updated passport, which is stored for future calls
- No cookies are set or read

## Caching

The module caches targeting responses in localStorage under the key `optable-cache:targeting` to improve performance:

- On the first page view, an API call is made
- The response is cached in localStorage
- On subsequent page views, cached data is used immediately
- A new API call updates the cache in the background

## Node Configuration

The `node` parameter is required and identifies your DCN node:

```javascript
params: {
  host: 'dcn.customer.com',
  site: 'my-site',
  node: 'us-east'  // Your node identifier
}
```

The node identifier routes the API call to the specified node and maintains separate passports per node.

## Custom RTD Handler

For advanced use cases, provide a custom `handleRtd` function:

```javascript
params: {
  host: 'dcn.customer.com',
  site: 'my-site',
  node: 'prod-us',
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
  site: 'my-site',           // Your site identifier
  node: 'prod-us'            // Your node identifier
}
```

### Key Differences:

1. **No External Loading**: Module no longer loads SDK from CDN, uses direct API calls instead
2. **Required Parameters**: `host`, `site`, and `node` are now required
3. **Ad Server Targeting**: Not supported. Use the Web SDK separately if you need GAM targeting keywords
4. **Custom Handler Signature**: Changed from `(reqBidsConfigObj, optableExtraData, mergeFn, skipCache)` to `(reqBidsConfigObj, targetingData, mergeFn)`
5. **Faster**: No external script loading delay
6. **Simpler**: Fewer dependencies and configuration options

## Excluded Features

The following Web SDK features are intentionally **not** supported in this RTD module to maintain simplicity:

- A/B testing framework
- Additional targeting signals (page URL ref)
- Ad server targeting keywords (use Web SDK for this)
- Event dispatching system
- Complex multi-storage key strategies

See `modules/optableRtdProvider_EXCLUDED_FEATURES.txt` for details.

## Troubleshooting

### "host parameter is required and must be a string"

Ensure you've configured the `host` parameter:

```javascript
params: {
  host: 'dcn.customer.com',  // Required!
  site: 'my-site',
  node: 'prod-us'
}
```

### "site parameter is required and must be a string"

Ensure you've configured the `site` parameter:

```javascript
params: {
  host: 'dcn.customer.com',
  site: 'my-site',  // Required!
  node: 'prod-us'
}
```

### "node parameter is required and must be a string"

Ensure you've configured the `node` parameter:

```javascript
params: {
  host: 'dcn.customer.com',
  site: 'my-site',
  node: 'prod-us'  // Required!
}
```

### No targeting data returned

Check:
1. Is `waitForIt: true` set in the dataProvider config?
2. Is `auctionDelay` set appropriately (e.g., 200ms)?
3. Are there identifiers available (check `ids` param and userId module)?
4. Check browser console for API errors
5. Verify your DCN hostname and site identifier are correct

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
