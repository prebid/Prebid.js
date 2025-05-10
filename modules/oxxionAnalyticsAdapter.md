# Overview
Module Name: oxxion Analytics Adapter

Module Type: Analytics Adapter

Maintainer: tech@oxxion.io

# Oxxion Analytics Adapter

Oxxion helps you to understand how your prebid stack performs.

# Integration

Add the oxxion analytics adapter module to your prebid configuration :
```
pbjs.enableAnalytics(
  ...
  {
    provider: 'oxxion',
    options : {
          domain: 'test.endpoint'
    }
  }
  ...
)
```

# Parameters

| Name                           | Type     | Description                                                                                                 |
|:-------------------------------|:---------|:------------------------------------------------------------------------------------------------------------|
| domain                         | String   | This string identifies yourself in Oxxion's systems and is provided to you by your Oxxion representative.   |

