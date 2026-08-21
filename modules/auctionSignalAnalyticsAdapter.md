# Auction Signal Analytics Adapter

## Overview

```txt
Module Name: Auction Signal Analytics Adapter
Module Type: Analytics Adapter
Maintainer: paulfarrow@microsoft.com
```

## About

The Auction Signal Analytics Adapter collects auction telemetry from Prebid.js and sends it to publisher-configured AI/demand partners. Publishers choose which vendors receive their data, and can opt to send raw telemetry, a **calculated auction signal score**, or both.

The auction signal provides a privacy-preserving alternative to sharing raw bid data - publishers can share a normalized score that represents demand quality without exposing specific CPM values or bidder details.

## Purpose

- **For Publishers**: Opt-in to share your auction telemetry with AI partners of your choice. You control which vendors receive your data.
- **For AI Vendors**: Receive standardized, Prebid-verified auction metrics for training models, demand analysis, and content valuation.
- **For the Ecosystem**: Creates a decentralized, transparent system where publishers maintain control over their data distribution.

## Analytics Options

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vendors` | array | Yes | Array of vendor configurations. Each vendor must have `name` and `endpoint`. |
| `vendors[].name` | string | Yes | Identifier for the vendor (e.g., 'microsoft', 'custom'). Used for logging. |
| `vendors[].endpoint` | string | Yes | URL where telemetry data will be sent via POST request. |
| `vendors[].dataMode` | string | No | What data to send: `'raw'` (default), `'index'`, or `'both'`. See Data Modes. |
| `vendors[].excludeFields` | array | No | Fields to exclude for this vendor (only applies to 'raw' mode). Overrides global. |
| `excludeFields` | array | No | Global list of fields to exclude from raw data (unless vendor specifies its own). |
| `publisherId` | string | No | Optional publisher identifier for segmenting data. |

### Data Modes

Each vendor can receive data in one of three modes:

| Mode | Description |
|------|-------------|
| `'raw'` | Send full auction telemetry (default). Respects `excludeFields`. |
| `'index'` | Send only the calculated auction signal with minimal metadata. No raw bid data. |
| `'both'` | Send both raw data and the auction signal in the same payload. |

### Example Configuration

#### Single Vendor

```javascript
pbjs.enableAnalytics({
  provider: 'auctionSignal',
  options: {
    vendors: [
      { name: 'microsoft', endpoint: 'https://ai.microsoft.com/demand/v1/ingest' }
    ],
    publisherId: 'pub-12345'
  }
});
```

#### Internal Tracking (Publisher's Own Endpoint)

Publishers can send demand data to their own analytics infrastructure. Simply add an entry to `vendors` with your own endpoint URL:

```javascript
pbjs.enableAnalytics({
  provider: 'auctionSignal',
  options: {
    vendors: [
      { 
        name: 'internal',  // Your own tracking
        endpoint: 'https://your-company.com/analytics/auction-signal',
        dataMode: 'both'   // Get full data + calculated score
      }
    ],
    publisherId: 'pub-12345'
  }
});
```

#### Internal + External Vendors

A common pattern is to send full data to your own endpoint while sharing only the signal with external AI vendors:

```javascript
pbjs.enableAnalytics({
  provider: 'auctionSignal',
  options: {
    vendors: [
      // Your internal analytics - receives everything
      { 
        name: 'internal', 
        endpoint: 'https://your-company.com/analytics/auction-signal',
        dataMode: 'both'
      },
      // External AI vendor - receives only the auction signal (no raw CPMs)
      { 
        name: 'microsoft', 
        endpoint: 'https://ai.microsoft.com/demand/v1/ingest',
        dataMode: 'index'
      }
    ],
    publisherId: 'pub-12345'
  }
});
```

#### Multiple Vendors

```javascript
pbjs.enableAnalytics({
  provider: 'auctionSignal',
  options: {
    vendors: [
      { name: 'microsoft', endpoint: 'https://ai.microsoft.com/demand/v1/ingest' },
      { name: 'custom', endpoint: 'https://my-analytics.example.com/prebid/ingest' }
    ],
    publisherId: 'pub-12345'
  }
});
```

#### With Data Modes (Privacy-Preserving)

Publishers can choose what data each vendor receives:

```javascript
pbjs.enableAnalytics({
  provider: 'auctionSignal',
  options: {
    vendors: [
      // Microsoft gets only the calculated signal (no raw bid data)
      { 
        name: 'microsoft', 
        endpoint: 'https://ai.microsoft.com/demand/v1/ingest',
        dataMode: 'index'
      },
      // Internal analytics gets everything
      { 
        name: 'internal', 
        endpoint: 'https://analytics.example.com/ingest',
        dataMode: 'both'
      }
    ],
    publisherId: 'pub-12345'
  }
});
```

#### With Field Filtering (Raw Mode)

For vendors receiving raw data, publishers can exclude specific fields:

```javascript
pbjs.enableAnalytics({
  provider: 'auctionSignal',
  options: {
    // Global exclusions apply to all 'raw' mode vendors
    excludeFields: ['cpmStats', 'bidderList'],
    vendors: [
      // Uses global exclusions
      { name: 'vendor1', endpoint: 'https://...' },
      // Overrides global - only excludes pageUrl
      { 
        name: 'vendor2', 
        endpoint: 'https://...',
        excludeFields: ['pageUrl']
      }
    ],
    publisherId: 'pub-12345'
  }
});
```

## Data Collected

The adapter collects the following data per auction. Publishers can exclude specific fields globally or per-vendor using `excludeFields`:

| Field | Description |
|-------|-------------|
| `domain` | The domain where the auction occurred |
| `pageUrl` | The page path (without domain) |
| `publisherId` | Publisher identifier if configured |
| `timestamp` | ISO 8601 timestamp of the auction |
| `auctionId` | Unique Prebid auction identifier |
| `adapterVersion` | Version of this analytics adapter |
| `pbjsVersion` | Version of Prebid.js |
| `userAgent` | Browser user agent string (useful for bot/AI agent detection) |
| `adUnits` | Number of ad units in the auction |
| `bidderRequests` | Total number of bid requests sent |
| `bidResponses` | Number of bid responses received |
| `noBids` | Number of no-bid responses |
| `uniqueBidders` | Count of unique bidders that participated |
| `bidderList` | Array of bidder codes that participated |
| `cpmStats` | Object with avg, max, min, median CPM values |
| `fillRate` | Ratio of responses to requests (0-1) |
| `auctionDuration` | Time in milliseconds for the auction |

### Available Fields for Exclusion

The following field names can be used in `excludeFields`:

`domain`, `pageUrl`, `publisherId`, `timestamp`, `auctionId`, `adapterVersion`, `pbjsVersion`, `userAgent`, `adUnits`, `bidderRequests`, `bidResponses`, `noBids`, `uniqueBidders`, `bidderList`, `cpmStats`, `fillRate`, `auctionDuration`

### Example Payload

The full payload (before any exclusions) sent to vendor endpoints:

```json
{
  "domain": "example.com",
  "pageUrl": "/articles/news-story",
  "publisherId": "pub-12345",
  "timestamp": "2025-12-18T15:30:00.000Z",
  "auctionId": "abc-123-def-456",
  "adapterVersion": "1.0.0",
  "pbjsVersion": "9.0.0",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "adUnits": 3,
  "bidderRequests": 9,
  "bidResponses": 6,
  "noBids": 3,
  "uniqueBidders": 3,
  "bidderList": ["appnexus", "rubicon", "openx"],
  "cpmStats": {
    "avg": 1.25,
    "max": 2.10,
    "min": 0.40,
    "median": 1.15
  },
  "fillRate": 0.67,
  "auctionDuration": 850,
  "contentContext": {
    "language": "en",
    "keywords": ["technology", "artificial intelligence"],
    "source": "ortb2"
  }
}
```

## Content Context Integration

If the publisher is using `chromeAiRtdProvider`, the adapter will automatically include content context in the payload. This provides AI vendors with both demand metrics and content classification data.

### How It Works

1. Chrome AI RTD provider detects page language and generates keywords
2. They store this data in Prebid's ORTB2 configuration at standard paths:
   - `site.content.language` - Detected page language (ISO 639-1 code)
   - `site.content.keywords` - Generated keywords/summary
3. The Auction Signal adapter reads this ORTB2 data and includes it in the payload

### Example with AI Providers

```javascript
// Enable AI content detection (requires Chrome with AI APIs enabled)
pbjs.setConfig({
  realTimeData: {
    dataProviders: [
      { name: 'chromeAi', waitForIt: true }
    ]
  }
});

// Enable auction signal analytics
pbjs.enableAnalytics({
  provider: 'auctionSignal',
  options: {
    vendors: [
      { name: 'microsoft', endpoint: 'https://ai.microsoft.com/demand/v1/ingest' }
    ]
  }
});
```

### Content Context Payload

When available, the `contentContext` field is included in all data modes:

```json
{
  "contentContext": {
    "language": "en",
    "keywords": ["Page summary or keywords from AI detection"],
    "source": "ortb2"
  }
}
```

| Field | Description |
|-------|-------------|
| `language` | ISO 639-1 language code (e.g., "en", "es", "fr") |
| `keywords` | Array of keywords or summary text from AI detection |
| `source` | Always "ortb2" - indicates data came from ORTB2 config |

If no AI provider is configured or the browser doesn't support the AI APIs, the `contentContext` field will be omitted from the payload.

## Vendor Integration

AI vendors who wish to receive this data should:

1. Provide publishers with an HTTPS endpoint URL
2. Accept POST requests with `Content-Type: application/json`
3. Parse the standardized payload schema documented above
4. Document their endpoint URL for publishers to configure

## Bot/AI Agent Detection

The `userAgent` field is included in payloads to help identify non-human traffic:

| Traffic Type | Example UA Patterns |
|--------------|---------------------|
| **Known bots** | `Googlebot`, `Bingbot`, `AhrefsBot`, `Slurp` |
| **Headless browsers** | `HeadlessChrome`, `PhantomJS` |
| **AI agents** | `GPTBot`, `Claude-Web`, `Anthropic` |
| **Automation tools** | `Puppeteer`, `Playwright`, `Selenium` |

**Note**: User agent strings can be spoofed, so this should be used as one signal among many for bot detection. However, legitimate crawlers typically identify themselves, and headless browser patterns are often detectable.

## Testing

To test this adapter:

1. **Enable debug mode:** `pbjs.setConfig({debug: true})`
2. **Monitor console** for `auctionSignal Analytics:` messages:
   - `Enabled with config:` - Configuration loaded
   - `Sending INDEX-only payload` - Index mode working
   - `Sending RAW payload` - Raw mode working
   - `Telemetry sent successfully` - Network requests successful
3. **Verify network requests** in DevTools to configured endpoints
4. **Check payload content** in Network tab - POST requests - Payload

## Privacy Considerations

- No user-level data is collected (user agent is not considered PII)
- No cookies or identifiers are used
- Only aggregate auction metrics are transmitted
- Domain/page URLs are sent in clear text (no hashing)
- Publishers must explicitly opt-in by enabling the adapter
- Publishers choose which vendors receive their data
- Publishers can exclude specific fields from being sent using `excludeFields`

## Building Prebid.js with this Adapter

```bash
gulp build --modules=auctionSignalAnalyticsAdapter,...
```

### With AI Content Detection

For full functionality including content context, include the Chrome AI RTD provider:

```bash
gulp build --modules=rtdModule,chromeAiRtdProvider,auctionSignalAnalyticsAdapter,...
```

## Maintainer

- **Author**: Dr. Paul Farrow
- **Contact**: paulfarrow@microsoft.com

## License

Apache 2.0
