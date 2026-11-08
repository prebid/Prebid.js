# Overview

**Module Name:** Semantiq Rtd Provider
**Module Type:** Rtd Provider
**Maintainer:** [Audienzz](https://audienzz.com)

## Description

This module retrieves real-time data from the SemantIQ service and populates ORTB data.

You need to obtain a company ID from [Audienzz](https://audienzz.com) for the module to function properly. Contact [service@audienzz.ch](mailto:service@audienzz.ch) for details.

## Integration

1. Include the module into your `Prebid.js` build.

  ```sh
  gulp build --modules='rtdModule,semantiqRtdProvider,...'
  ```

1. Configure the module via `pbjs.setConfig`.

  ```js
  pbjs.setConfig({
    ...
    realTimeData: {
      dataProviders: [
        {
          name: 'semantiq',
          waitForIt: true,
          params: {
            companyId: 12345,
            timeout: 1000,
          },
        },
      ],
    },
  });
  ```

## Parameters

| Name       | Required | Description                                                       | Type               | Default value | Example               |
| ---------- | -------- | ----------------------------------------------------------------- | ------------------ | ------------- | --------------------- |
| companyId  | No       | Company ID or IDs obtained from [Audienzz](https://audienzz.com). | number \| number[] | -             | 12345                 |
| timeout    | No       | The maximum time to wait for a response in milliseconds.          | number             | 1000          | 3000                  |

## ORTB data

The module appends all SemantIQ keywords to `site.keywords`. IAB category ids are also written to `site.content.data`, one entry per taxonomy: `segtax` 6 for IAB Content Taxonomy 2.2 and `segtax` 7 for IAB Content Taxonomy 3.0. A page with Content Taxonomy 2.2 category `379` and Content Taxonomy 3.0 category `386` gets:

```js
site: {
  keywords: 'sentiment=negative,iab_category_id=386,iab_category=politics,iab2_category=news and politics,iab2_category_id=379',
  content: {
    data: [
      { name: 'semantiq', ext: { segtax: 6 }, segment: [{ id: '379' }] },
      { name: 'semantiq', ext: { segtax: 7 }, segment: [{ id: '386' }] },
    ],
  },
}
```

### Site categories

The module also adds IAB category ids to `site.cat` when you set `site.cattax` to `6` or `7` in your first party data. Without it, `site.cat` is left alone. The module never sets `site.cattax` itself, because it also defines the taxonomy of `site.sectioncat` and `site.pagecat`.

```js
pbjs.setConfig({
  ortb2: {
    site: {
      cattax: 7,
    },
  },
});
```

Check these before you set `site.cattax`:

- Some bid adapters forward `site.cat` without `site.cattax`, so their bidders read the ids as IAB Content Taxonomy 1.0.
- RTD modules run in parallel. A module that writes site categories in another taxonomy, such as `neuwoRtdProvider`, `arcspanRtdProvider` or `relevadRtdProvider`, can mix its categories into `site.cat` or replace `site.cattax`.
- Only the global `site` is read. `site.cattax` set for a single bidder in `ortb2Fragments.bidder` is not taken into account.

`site.content.data` is not affected by any of these.
