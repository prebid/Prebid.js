# Overview

```
Module Name: Railu Analytics Adapter
Module Type: Analytics Adapter
Maintainer: dev@railu.ai
```

# Description

Reports what happened to every ad slot on a page view to Railu, so a publisher sees its whole supply in the Railu
console (Sell, Supply): every slot by site and format, who bought it and at what price, what the ad server filled and
what went unsold. One small report per auction, sent as low-priority background work about three seconds after the auction
ends, so it never sits on the page's critical path. It never bids and never changes the auction. It sends no user
identifiers, no cookies and nothing about the visitor: only the page's domain and, per slot, its format, sizes, how
many bidders were asked and answered, the top bid, the winner (bidder, price, deal) and whether it rendered.

# Options

| Name | Scope | Description | Example |
|---|---|---|---|
| `tid` | required | your public Railu tag ID; reports count as yours on your own domains | `'t_k3m9p2x7q4w8z6'` |
| `sample` | optional | share of page views to report, 0 to 1 (default 1; 0 reports none); Railu weighs each report by 1 / sample | `0.25` |
| `endpoint` | optional | override the endpoint (staging) | `'https://railu-edge-staging.praevis.workers.dev/v1/observe'` |

# Example

```js
pbjs.enableAnalytics({
  provider: 'railu',
  options: { tid: 't_k3m9p2x7q4w8z6' }
});
```
