# Overview
​
```
Module Name:  Konduit Analytics Adapter
Module Type:  Analytics Adapter
Maintainer:   support@konduit.me
```
​
​
# Description
​
Konduit Analytics adapter pushes Prebid events into Konduit platform, which is then organizes the data and presents it to a client in different insightful views.
​
For more information, visit the [official Konduit website](https://konduitvideo.com/).
​
​
# Usage
​
Konduit Analytics can be enabled with a standard `enableAnalytics` call.
Note it is also important to provide a valid Konduit identifier as a config parameter.
​
```javascript
pbjs.setConfig({
  konduit: {
    konduitId: your_konduit_id,
  }
});
​
pbjs.enableAnalytics({
  provider: 'konduit'
})
```
