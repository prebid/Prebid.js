# Echo Ads Module

## Overview

The Echo Ads module enables publisher-controlled ad units that appear when users reach the end of content consumption or meet other configurable trigger conditions. This module works with any Prebid.js bidder adapter and provides:

- **Configurable Triggers**: Scroll depth, time on page, exit intent, or custom functions
- **Bid Pre-fetching**: Reduce latency by fetching bids before the ad is shown
- **Overlay/Interstitial Display**: Show ads in an engaging overlay format
- **Frequency Capping**: Control how often users see Echo Ads
- **Size Control**: Configure which ad sizes are eligible to bid

## Configuration

### Basic Configuration

```javascript
pbjs.setConfig({
  echoAds: {
    adUnit: {
      code: 'echo-ad-slot',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [728, 90]]  // Control eligible ad sizes
        }
      },
      bids: [
        { bidder: 'gumgum', params: { zone: 'example' } },
        { bidder: 'appnexus', params: { placementId: '12345' } },
        { bidder: 'rubicon', params: { accountId: '123', siteId: '456', zoneId: '789' } }
      ]
    },
    trigger: {
      scroll: { depth: 90 },      // Trigger at 90% scroll depth
      timeOnPage: 45000           // OR after 45 seconds on page
    },
    prefetch: {
      mode: 'lazy',                // 'eager' or 'lazy'
      lazyTriggerPoint: {
        scroll: { depth: 70 }      // Start fetching bids at 70% scroll
      }
    },
    display: {
      type: 'overlay',             // 'overlay' or 'interstitial'
      closeButton: true,
      closeDelay: 3000,            // Delay before close button is enabled (ms)
      frequency: {
        maxPerSession: 1,
        maxPerDay: 3
      }
    },
    onTrigger: function() {
      console.log('Echo Ad triggered!');
    },
    onAdRender: function() {
      console.log('Echo Ad rendered!');
    },
    onAdClose: function() {
      console.log('Echo Ad closed!');
    }
  }
});
```

## Configuration Options

### `adUnit` (required)

Standard Prebid.js ad unit configuration. This determines which bidders participate and what ad sizes are eligible.

**Key Properties:**
- `code`: Unique identifier for the ad unit
- `mediaTypes.banner.sizes`: Array of eligible ad sizes (e.g., `[[300, 250], [728, 90]]`)
- `bids`: Array of bidder configurations (works with ANY Prebid.js bidder)

### `trigger` (required)

Defines when the Echo Ad should appear. Multiple trigger types can be combined (OR logic).

**Options:**
- `scroll`: Object with `depth` (percentage, 0-100)
- `timeOnPage`: Time in milliseconds
- `exitIntent`: Boolean - triggers when cursor leaves viewport
- `custom`: Function that returns boolean - for custom trigger logic

**Example:**
```javascript
trigger: {
  scroll: { depth: 90 },
  custom: function() {
    return window.myArticleReader && window.myArticleReader.progress === 100;
  }
}
```

### `prefetch` (optional)

Controls when bids are fetched to reduce latency.

**Options:**
- `mode`: `'eager'` (fetch on page load) or `'lazy'` (fetch when trigger point reached)
- `lazyTriggerPoint`: Same format as `trigger` - defines when to start fetching bids

**Strategies:**
- **Eager**: Best for high-engagement content where Echo Ad is likely to show
- **Lazy**: Best for reducing wasted bid requests on low-engagement pages

### `display` (optional)

Controls how the ad is displayed.

**Options:**
- `type`: `'overlay'` or `'interstitial'` (default: `'overlay'`)
- `closeButton`: Boolean - show close button (default: `true`)
- `closeDelay`: Milliseconds before close button is enabled (default: `0`)
- `frequency.maxPerSession`: Max times to show per session
- `frequency.maxPerDay`: Max times to show per day

### Callbacks (optional)

- `onTrigger()`: Called when trigger conditions are met
- `onAdRender()`: Called when ad is displayed
- `onAdClose()`: Called when user closes ad

## Ad Size Configuration

Echo Ads supports standard display banner sizes. Publishers can control which sizes are eligible by configuring the `mediaTypes.banner.sizes` array:

```javascript
adUnit: {
  code: 'echo-ad-slot',
  mediaTypes: {
    banner: {
      sizes: [
        [300, 250],    // Medium Rectangle
        [728, 90],     // Leaderboard
        [300, 600],    // Half Page
        [320, 50]      // Mobile Banner
      ]
    }
  },
  bids: [/* ... */]
}
```

**Common Sizes:**
- `[300, 250]` - Medium Rectangle
- `[728, 90]` - Leaderboard
- `[300, 600]` - Half Page (Portrait)
- `[160, 600]` - Wide Skyscraper
- `[320, 50]` - Mobile Banner
- `[320, 100]` - Large Mobile Banner

## Manual Trigger

Publishers can manually trigger Echo Ads using the API:

```javascript
pbjs.echoAds.trigger();
```

This is useful for integrating with custom CMS or reader experiences.

## Examples

### Simple Scroll-Based Echo Ad

```javascript
pbjs.setConfig({
  echoAds: {
    adUnit: {
      code: 'echo-ad-slot',
      mediaTypes: {
        banner: { sizes: [[300, 250]] }
      },
      bids: [
        { bidder: 'gumgum', params: { zone: 'example' } }
      ]
    },
    trigger: {
      scroll: { depth: 95 }
    },
    display: {
      frequency: { maxPerSession: 1 }
    }
  }
});
```

### Time-Based Echo Ad with Pre-fetch

```javascript
pbjs.setConfig({
  echoAds: {
    adUnit: {
      code: 'echo-ad-slot',
      mediaTypes: {
        banner: { sizes: [[728, 90], [300, 250]] }
      },
      bids: [
        { bidder: 'appnexus', params: { placementId: '12345' } },
        { bidder: 'rubicon', params: { accountId: '123', siteId: '456', zoneId: '789' } }
      ]
    },
    trigger: {
      timeOnPage: 60000  // After 1 minute
    },
    prefetch: {
      mode: 'eager'  // Start fetching bids immediately
    }
  }
});
```

### Custom Trigger with Article Progress

```javascript
pbjs.setConfig({
  echoAds: {
    adUnit: {
      code: 'echo-ad-slot',
      mediaTypes: {
        banner: { sizes: [[300, 600]] }
      },
      bids: [
        { bidder: 'gumgum', params: { zone: 'example' } }
      ]
    },
    trigger: {
      custom: function() {
        // Integrate with your article reader
        return window.articleComplete === true;
      }
    },
    prefetch: {
      mode: 'lazy',
      lazyTriggerPoint: {
        scroll: { depth: 80 }
      }
    }
  }
});
```

## Frequency Capping

Echo Ads includes built-in frequency capping to prevent ad fatigue:

- **Session-based**: Uses `sessionStorage` - resets when browser tab is closed
- **Daily**: Uses `localStorage` - resets at midnight

Example:
```javascript
display: {
  frequency: {
    maxPerSession: 1,   // Show only once per session
    maxPerDay: 3        // Max 3 times per day
  }
}
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `localStorage` and `sessionStorage` for frequency capping
- Gracefully degrades if storage is unavailable

## Integration with Bidders

Echo Ads works with **any** Prebid.js bidder adapter. Simply include the bidder in the `bids` array:

```javascript
bids: [
  { bidder: 'gumgum', params: { zone: 'example' } },
  { bidder: 'appnexus', params: { placementId: '12345' } },
  { bidder: 'rubicon', params: { accountId: '123', siteId: '456', zoneId: '789' } },
  { bidder: 'openx', params: { unit: '123', delDomain: 'example-d.openx.net' } }
  // ... any other Prebid.js bidder
]
```

## Building

To include the Echo Ads module in your Prebid.js build:

```bash
gulp build --modules=echoAdsModule,gumgumBidAdapter,appnexusBidAdapter,...
```

## Testing

See `integrationExamples/gpt/echoAds_example.html` for a working demonstration.
