## Overview

Module Name: Media.net Realtime Module  
Module Type: Rtd Provider  
Maintainer: prebid-support@media.net  

# Description

The module currently provisions Media.net's Intelligent Refresh configured by the publisher.

### Intelligent Refresh

Intelligent Refresh (IR) module lets publisher refresh their ad inventory without affecting page experience of visitors through configured criteria. The module optionally provides tracking of refresh inventory and appropriate targeting in GAM. Publisher configured criteria is fetched via an external JS payload.

# Integration

1) Build the  Media.net Intelligent Refresh RTD module into the Prebid.js package with:

```
gulp build --modules=medianetRtdProvider
```

# Configurations

2) Enable Media.net Real Time Module using `pbjs.setConfig`

```javascript
pbjs.setConfig({
    realTimeData: {
        dataProviders: [{
            name: 'medianet',
            params: {
                cid: '8CUX0H51C'
            }
        }]
    }
});
```
