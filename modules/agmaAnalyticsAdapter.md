# Overview
    Module Name: Agma Analytics
    Module Type: Analytics Adapter
    Maintainer: [www.agma-mmc.de](https://www.agma-mmc.de)
    Technical Support: [info@mllrsohn.com](mailto:info@mllrsohn.com)

# Description

Agma Analytics adapter. Please contact [team-internet@agma-mmc.de](mailto:team-internet@agma-mmc.de) for signup and access to [futher documentation](https://docs.agma-analytics.de).

# Usage

Add the `agmaAnalyticsAdapter` to your build:

```
gulp build --modules=...,agmaAnalyticsAdapter...
```

Configure the analytics module:

```javascript
pbjs.enableAnalytics({
    provider: 'agma',
    options: {
        code: 'provided-by-agma'    // change to the code you received from agma
    }
});
```
