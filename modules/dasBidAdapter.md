# Overview

```
Module Name: DAS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@ringpublishing.com
```

# Description

Module that connects to DAS demand sources.
Only banner and native format is supported.

# Test Parameters
```js
var adUnits = [{
  code: 'test-div-ad',
  mediaTypes: {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  },
  bids: [{
    bidder: 'das',
    params: {
      network: '4178463',
      site: 'test',
      area: 'areatest',
      slot: 'slot'
    }
  }]
}];
```

# Parameters

| Name                         | Scope    | Type     | Description                                                                                                                                                                                                                                                                | Example                                                                                     |
|------------------------------|----------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| network                      | required | String   | Specific identifier provided by DAS                                                                                                                                                                                                                                        | `"4178463"`                                                                                 |
| site                         | required | String   | Specific identifier name (case-insensitive) that is associated with this ad unit. Represents the website/domain in the ad unit hierarchy                                                                                                                                   | `"example_com"`                                                                             |
| area                         | required | String   | Ad unit category name; only case-insensitive alphanumeric with underscores and hyphens are allowed. Represents the content section or category                                                                                                                             | `"sport"`                                                                                   |
| slot                         | required | String   | Ad unit placement name (case-insensitive)                                                                                                                                                                                                                                  | `"slot"`                                                                                    |
| slotSequence                 | optional | Number   | Ad unit sequence position provided by DAS                                                                                                                                                                                                                                  | `1`                                                                                         |
| pageContext                  | optional | Object   | Web page context data                                                                                                                                                                                                                                                      | `{}`                                                                                        |
| pageContext.dr               | optional | String   | Document referrer URL address                                                                                                                                                                                                                                              | `"https://example.com/"`                                                                    |
| pageContext.du               | optional | String   | Document URL address                                                                                                                                                                                                                                                       | `"https://example.com/sport/football/article.html?id=932016a5-02fc-4d5c-b643-fafc2f270f06"` |
| pageContext.dv               | optional | String   | Document virtual address as slash-separated path that may consist of any number of parts (case-insensitive alphanumeric with underscores and hyphens); first part should be the same as `site` value and second as `area` value; next parts may reflect website navigation | `"example_com/sport/football"`                                                              |
| pageContext.keyWords         | optional | String[] | List of keywords associated with this ad unit; only case-insensitive alphanumeric with underscores and hyphens are allowed                                                                                                                                                 | `["euro", "lewandowski"]`                                                                   |
| pageContext.keyValues        | optional | Object   | Key-values associated with this ad unit (case-insensitive); following characters are not allowed in the values: `" ' = ! + # * ~ ; ^ ( ) < > [ ] & @`                                                                                                                      | `{}`                                                                                        |
| pageContext.keyValues.ci     | optional | String   | Content unique identifier                                                                                                                                                                                                                                                  | `"932016a5-02fc-4d5c-b643-fafc2f270f06"`                                                    |
| pageContext.keyValues.adunit | optional | String   | Ad unit name                                                                                                                                                                                                                                                               | `"example_com/sport"`                                                                       |
| customParams                 | optional | Object   | Custom request params                                                                                                                                                                                                                                                      | `{}`                                                                                        |
