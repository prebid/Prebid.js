# Overview

Module Name: MavenDistribution Analytics Adapter
Module Type: Analytics Adapter
Maintainer: yonathan.randolph@maven.io

# Description

Reports ad bids to MavenDistribution (aka Petametrics or LiftIgniter).

# Configuration

`zoneMap` is expected to be a map of `adUnit.code` to `{index, zone}`.

```
pbjs.enableAnalytics({
  provider: 'mavenDistributionAnalyticsAdapter',
  options: {
    sampling: 1,
    zoneMap: {
      "ad-123456": {"index": 0, "zone": "sidemap"},
    }
  },
});
```
