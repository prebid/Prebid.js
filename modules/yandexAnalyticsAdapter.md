## Overview

```
Module Name: Yandex Analytics Adapter
Module Type: Analytics Adapter
Maintainer: prebid@yandex-team.com
```

## Description

The Yandex Analytics Adapter integrates Prebid.js with [Yandex Metrica](https://metrica.yandex.com/about), a top-5 worldwide web analytics tool. It offers detailed insights into auction performance and user behavior, enabling publishers to make data-driven decisions to optimize their ad revenue.

Disclosure: The adapter utilizes the Metrica Tag build based on [github.com/yandex/metrica-tag](https://github.com/yandex/metrica-tag), approximately 60 kB gzipped.

## Setup Instructions

1. **Register Your Website:**

   Visit [Yandex Metrica](https://metrica.yandex.com/) and register your website to obtain a counter ID.

2. **Insert Counter Initialization Code:**

   Retrieve the counter initialization code from the Yandex Metrica settings page at `https://metrica.yandex.com/settings?id={counterId}`, where `{counterId}` is your counter ID, and embed it into your website's HTML.

3. **Initialize the Adapter in Prebid.js:**

   Configure the Yandex Analytics Adapter in your Prebid.js setup. For optimal performance and ease of management, it is preferred to use a single counter. Add the following JavaScript snippet, replacing `123` with your actual counter ID:

   ```javascript
   pbjs.enableAnalytics({
     provider: "yandex",
     options: {
       // Replace 123 with your actual counter ID
       // It's preferred to use a single counter for optimal performance and ease of management
       counters: [123]
     }
   });
   ```

4. **Special Instructions for Single Page Applications (SPAs):**

   If your website is an SPA, make sure to [configure your Metrica tag accordingly](https://yandex.com/support/metrica/code/counter-spa-setup.html).

## Accessing Analytics Data

You can view the collected analytics data in the Yandex Metrica dashboard. Navigate to [metrika.yandex.com/dashboard](https://metrika.yandex.com/dashboard) and look for the Prebid Analytics section to analyze your data.
