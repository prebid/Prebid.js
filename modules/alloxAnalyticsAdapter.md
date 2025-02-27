# Overview

```txt
Module Name: allox Analytics Adapter
Module Type: Analytics Adapter
Maintainer:  mi-allox-devbot@ml.nttdocomo.com
```

# About

The Allox Analytics Adapter collects and transmits bidding data to Allox's internal analytics server.

This includes bids that lost within Allox's system as well as cases where Allox lost in the overall auction.

The collected data is used to analyze auction performance and optimize bidding strategies.

# Example Configuration

```js
pbjs.enableAnalytics({
    provider: 'allox'
});
```
