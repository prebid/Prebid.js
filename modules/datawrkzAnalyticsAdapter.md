# Overview

**Module Name:** Datawrkz Analytics Adapter  
**Module Type:** Analytics Adapter  
**Maintainer:** dev@datawrkz.com

---

## Description

Analytics adapter for Datawrkz — captures Prebid.js auction data and sends it to Datawrkz analytics server for reporting and insights.

---

## Settings

Enable the adapter using:

```js
pbjs.enableAnalytics({
  provider: 'datawrkzanalytics',
  options: {
    // No custom options required
  }
});
