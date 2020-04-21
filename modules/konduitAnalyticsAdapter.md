# Overview

```
Module Name:  Konduit Analytics Adapter
Module Type:  Analytics Adapter
Maintainer:   TBD
```

# Description

Analytics adapter for Konduit.

# Test Parameters

```javascript
pbjs.que.push(function () {
    pbjs.setConfig({
      konduit: {
        konduitId: 'your_konduit_id',
      }
    });
    pbjs.enableAnalytics({
      provider: 'konduit'
    })
});
```
