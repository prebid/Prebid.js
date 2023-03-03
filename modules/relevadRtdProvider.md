# Relevad Real-Time Data Submodule

Module Name: Relevad Rtd Provider
Module Type: Rtd Provider
Maintainer: anna@relevad.com

# Description

Relevad is a contextual semantic analytics company. Our privacy-first, cookieless contextual categorization, segmentation, and keyword generation platform is designed to help publishers and advertisers optimize targeting and increase ad inventory yield.

Our real-time data processing module provides quality contextual IAB categories and segments along with their relevancy scores to the publisher’s web page. It places them into auction bid requests as global and/or bidder-specific:

| Attrubute Type | ORTB2 Attribute                                              |
| -------------- | ------------------------------------------------------------ |
| Contextual     | “site.cat”: [IAB category codes]<br/>“site.pagecat”: [IAB category codes],<br>“site.sectioncat”: [IAB category codes]<br>“site.cattax”: 6 |
| Content        | “site.content.data”: {“name”: “relevad”, “ext”: …, “segment”: …} |
| User Data      | “user.ext.data.relevad_rtd”: {segments}                      |

Publisher may configre minimum relevancy score to restrict the categories and segments we pass to the bidders.
Relevad service does not use browser cookies and is fully GDPR compliant.

### Publisher Integration

Compile the Relevad RTD module into the Prebid.js package with

`gulp build --modules=rtdModule,relevadRtdProvider`

Add Relevad RTD provider to your Prebid config. Here is an example:

```
pbjs.setConfig(
    ...
    realTimeData: {
      auctionDelay: 1000,
      dataProviders: [
        {
          name: "RelevadRTDModule",
          waitForIt: true,
          params: { 
          	partnerId: your_partner_id, // Your Relevad partner id.
          	setgpt: true,               // Target or not google GAM/GPT on your page.
            minscore: 30,               // Minimum relevancy score (0-100). If absent, defaults to 30.
 
            // The list of bidders to target with Relevad categories and segments. If absent or empty, target all bidders.
            bidders: [
              { bidder: "appnexus",                   // Bidder name
                adUnitCodes: ['adUnit-1','adUnit-2'], // List of adUnit codes to target. If absent or empty, target all ad units.
                minscore: 70, // Minimum relevancy score for this bidder (0-100). If absent, defaults to the global minscore.
              },
              ...
            ]
          }
      }
    ]
  }
 ...
}
```

### Relevad Real Time Submodule Configuration Parameters



{: .table .table-bordered .table-striped }
| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| name | String | Relevad RTD module name | Mandatory, must be **RelevadRTDModule** |
| waitForIt | Boolean | Whether to delay auction for the RTD module response | Optional. Defaults to false.We recommend setting it to true. Relevad RTD service is very fast. |
| params | Object | | Relevad RTD module configuration |
| params.partnerid | String | Relevad Partner ID, required to enable the service | Mandatory |
| params.publisherid | String | Relevad publisher id | Mandatory |
| params.apikey | String | Relevad API key | Mandatory |
| param.actualUrl | String | Your page URL. When present, will be categorized instead of the browser-provided URL | Optional, defaults to the browser-providedURL |
| params.setgpt | Boolean | Target or not Google GPT/GAM when it is configured on your page | Optional, defaults to true. |
| params.minscore | Integer | Minimum categorization relevancy score in the range of 0-100. Our categories and segments come  with their relevancy scores. We’ll send to the bidders only categories and segments with the scores higher than the minscore. |Optional, defaults to 30|
| params.bidders | Dictionary | Bidders with which to share category and segment information | Optional. If empty or absent, target all bidders. |



#### Bidder-specific configuration. Every bidder may have these configuration parameters

| Name  |Type | Description   | Notes  |
| :------------ | :------------ | :------------ |:------------ |
| bidder | String | Bidder name | Mandatory. Example: “appnexus” |
| adUnitCodes | Array of Strings | List of specific AdUnit codes you with to target | Optional. If empty or absent, all ad units are targeted. |
| minscore | Integer | Bidder-specific minimum categorization relevancy score (0, 100) | Optional, defaults to global minscore above. |

If you do not have your own `partnerid, publisherid, apikey` please reach out to [info@relevad.com](mailto:info@relevad.com).

### Testing

To view an example of the on page setup required:

```bash
gulp serve-fast --modules=rtdModule,relevadRtdProvider
```

Then in your browser access:

```
http://localhost:9999/integrationExamples/gpt/relevadRtdProvider_example.html
```

Run the unit tests for Relevad RTD module:

```bash
gulp test --file "test/spec/modules/relevadRtdProvider_spec.js"
```