# Overview

Module Name: Kargo Analytics Adapter
Module Type: Analytics Adapter
Maintainer: support@kargo.com

# Description

Analytics adapter for Kargo. Contact support@kargo.com for information.

# Usage

The simplest way to enable the analytics adapter is this

```javascript
pbjs.enableAnalytics([{
  provider: 'kargo',
  options: {
      sampling: 100 // value out of 100
  }
}]);
```

# Test Parameters

```
{
  provider: 'kargo',
  options: {
      sampling: 100
  }
}
```