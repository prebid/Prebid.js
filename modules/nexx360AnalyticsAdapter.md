# Overview

Module Name: Nexx360 Analytics Adapter
Module Type: Analytics Adapter
Maintainer: tech@nexx360.io

# Description

The Nexx360 Analytics Adapter collects Prebid.js auction data and sends it to the Nexx360 analytics platform for monitoring and reporting. It tracks auction lifecycle events, bid requests, bid responses, wins, timeouts, and ad render events.

# Registration

The Nexx360 Analytics adapter requires a publisher ID from Nexx360. Please contact Nexx360 to obtain your publisher credentials.

```javascript
pbjs.enableAnalytics({
  provider: 'nexx360',
  options: {
    publisherId: 'your-publisher-id',
    endpoint: 'https://monitoring.nexx360.io'
  }
});
```

Sampling is applied server-side (by the Nexx360 collector), so the adapter sends
all events and exposes no sampling option.

# Analytics Options

{: .table .table-bordered .table-striped }
| Name | Scope | Description | Example | Type |
|------|-------|-------------|---------|------|
| publisherId | required | Your Nexx360 publisher identifier | `"pub-12345"` | string |
| endpoint | optional | Analytics endpoint URL (defaults to `https://monitoring.nexx360.io`) | `"https://monitoring.nexx360.io"` | string |
| abTestLabel | optional | A/B test variant label, attached to every event for slicing analytics by test arm | `"variantA"` | string |

# Events Tracked

The adapter tracks the following Prebid.js events:

- **auctionInit** - When an auction starts
- **bidRequested** - When bid requests are sent to bidders
- **bidResponse** - When bid responses are received
- **bidWon** - When a bid wins the auction
- **bidTimeout** - When bidders timeout
- **adRenderSucceeded** - When an ad renders successfully
- **adRenderFailed** - When an ad fails to render

# Example Configuration

## Basic Setup

```javascript
pbjs.enableAnalytics({
  provider: 'nexx360',
  options: {
    publisherId: 'your-publisher-id'
  }
});
```

## Production Setup

```javascript
pbjs.enableAnalytics({
  provider: 'nexx360',
  options: {
    publisherId: 'your-publisher-id',
    endpoint: 'https://monitoring.nexx360.io'
  }
});
```

# Build

To include this analytics adapter in your Prebid.js build:

```bash
gulp build --modules=nexx360AnalyticsAdapter,...
```
