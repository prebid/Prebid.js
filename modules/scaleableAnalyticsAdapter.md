# Overview

```txt
Module Name: Scaleable Analytics Adapter
Module Type: Analytics Adapter
Maintainer: chris@scaleable.ai
```

# Description

Analytics adapter for [scaleable.ai](https://scaleable.ai). Contact
team@scaleable.ai for more information or to sign up for analytics. See
[Scaleable Advertising](https://scaleable.ai/services/advertising).

# Usage

Add the `scaleableAnalyticsAdapter` to your build:

```
gulp build --modules=scaleableAnalyticsAdapter,<your-bid-adapters>
```

Configure the analytics module:

```js
pbjs.enableAnalytics({
  provider: 'scaleable',
  options: {
    siteId: 'YOUR_SITE_ID', // contact Scaleable to receive your siteId
    // Optional overrides
    auctionEndDelay: 1000,
    sampling: 1.0
  }
});
```

| Option            | Required | Default  | Description                                                              |
| ----------------- | -------- | -------- | ------------------------------------------------------------------------ |
| `siteId`          | Yes      | —        | Identifies your site to Scaleable. Always required.                      |
| `endpoint`        | No       | —        | Override the default reporting URL (testing).                            |
| `auctionEndDelay` | No       | `1500`   | ms to wait after `AUCTION_END` before reporting, to catch late events.   |
| `sampling`        | No       | `1.0`    | Forwarded to the base class. Set < 1.0 to sample a fraction of sessions. |
