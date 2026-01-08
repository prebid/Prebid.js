# Sirdata RTD/SDA Module

Module Name: Sirdata Real-time SDA Module
Module Type: Rtd Provider
Maintainer: bob@sirdata.com

# Description

Sirdata provides a disruptive API that allows publishers and SDA compliant SSPs/DSPs to leverage its cutting-edge contextualization technology and its audience segments!

User-based segments and page-level automatic contextual categories will be attached to bid request objects sent to different bidders in order to optimize targeting.

Automatic or custom integration with Google Ad Manager and major bidders like Xandr's, Equativ's, Index Exchange's, Proxistore's, Magnite's or Triplelift's !

User's country and choice management are included in the module, so it's 100% compliant with local and regional laws like GDPR and CCPA/CPRA.

ORTB2 compliant and FPD support for Prebid versions < 4.29

Fully supports Seller Defined Audience ! Please find the full SDA taxonomy ids list <a href='https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/segtax.md' target='_blank'>here</a>.

Please contact <prebid@sirdata.com> for more information.

## Publisher Usage

### Configure Prebid.js

Compile the Sirdata RTD module into your Prebid build:

`gulp build --modules=rtdModule,sirdataRtdProvider`

Add the Sirdata RTD provider to your Prebid config.

`actualUrl` MUST be set with actual location of parent page if prebid.js is loaded in an iframe (e.g. hosted). It can be left blank ('') or removed otherwise.

`partnerId` and `key` should be provided by your partnering SSP or get one and your dedicated taxonomy from Sirdata (<prebid@sirdata.com>). Segments ids (user-centric) and category ids (page-centric) will be provided salted and hashed : you can use them with a dedicated and private matching table.

Should you want to allow any SSP or a partner to curate your media and operate cross-publishers campaigns with our data, please ask Sirdata (<prebid@sirdata.com>) to whitelist him it in your account.

#### Typical configuration

```javascript
pbjs.setConfig({
    // ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "SirdataRTDModule",
                waitForIt: true,
                params: {
                    partnerId: 1,
                    key: 1,
                }
            }
        ]
    }
    // ...
});
```

#### Advanced configuration

```javascript
pbjs.setConfig({
    // ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "SirdataRTDModule",
                waitForIt: true,
                params: {
                    partnerId: 1,
                    key: 1,
                    setGptKeyValues: true,
                    contextualMinRelevancyScore: 50, //Min score to filter contextual category globally (0-100 scale)
                    actualUrl: '' //top location url, for contextual categories
                }
            }
        ]
    }
    // ...
});
```

### Parameter Descriptions for the Sirdata Configuration Section

| Name                               | Type                      | Description                                                                                                                             | Notes                                                                                                    |
|:-----------------------------------|:--------------------------|:----------------------------------------------------------------------------------------------------------------------------------------|:---------------------------------------------------------------------------------------------------------|
| name                               | String                    | Real time data module name                                                                                                              | Mandatory. Always 'SirdataRTDModule'                                                                     |
| waitForIt                          | Boolean                   | Required to ensure that the auction is delayed until prefetch is complete                                                               | Optional. Default to false but recommended to true                                                       |
| params                             | Object                    | Settings                                                                                                                                | Optional                                                                                                 |
| params.partnerId                   | Integer                   | Partner ID, required to get results and provided by Sirdata. Use 1 for tests and request your Id at <prebid@sirdata.com>                | Mandatory. Default 1                                                                                     |
| params.key                         | Integer                   | Key linked to Partner ID, required to get results and provided by Sirdata. Use 1 for tests and request your key at <prebid@sirdata.com> | Mandatory. Default 1                                                                                     |
| params.setGptKeyValues             | Boolean                   | Sets Targeting for GPT/GAM                                                                                                              | Optional. Default to true                                                                                |
| params.authorizedEids              | Array of String           | List of authorised Eids for graph. Set [] to prevent all Eids usage                                                                     | Optional. Default to : ID5, pubProvidedId and sharedId                                                   |
| params.avoidPostContent            | Boolean                   | Block contextual data POST from user's device (a crawler is use instead)                                                                | Optional. Default to false, and setting it to true results in your content downloaded by Sirdata crawler |
| params.contextualMinRelevancyScore | Integer                   | Min relevancy score to filter categories sent to the bidders (0-100 scale).                                                             | Optional. Defaults to 30.                                                                                |
| params.bidders                     | Array of Object           | Bidders you want to supply your own data to (works only with your private data bought to Sirdata)                                       | Optional                                                                                                 |

Bidders can receive common setting :

| Name           | Type            | Description                                                                                    | Notes                                                                     |
|:---------------|:----------------|:-----------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------|
| bidder         | String          | Bidder name                                                                                    | Mandatory if params.bidders are specified                                 |
| adUnitCodes    | Array of String | Use if you want to limit data injection to specified adUnits for the bidder                    | Optional. Default is false and data shared with the bidder isn't filtered |
| customFunction | Function        | Use it to override the way data is shared with a bidder                                        | Optional. Default is false                                                |
| curationId     | String          | Specify the curation ID of the bidder. Provided by Sirdata, request it at <prebid@sirdata.com> | Optional. Default curation ids are specified for main bidders             |

### Overriding data sharing function

As indicated above, it is possible to provide your own bid augmentation functions. This is useful if you know a bid adapter's API supports segment fields which aren't specifically being added to request objects in the Prebid bid adapter.

Please see the following example, which provides a function to modify bids for a bid adapter called ix and overrides the appnexus.
data Object format for usage in this kind of function :

```json
{
  "segments": [
    111111,
    222222
  ],
  "segtaxid": null,
  "cattaxid": null,
  "contextual_categories": {
    "333333": 100
  },
  "shared_taxonomy": {
    "27440": {
      "segments": [
        444444,
        555555
      ],
      "segtaxid": 552,
      "cattaxid": 553,
      "contextual_categories": {
        "666666": 100
      }
    }
  },
  "global_taxonomy": {
    "9998": {
      "segments": [
        123,
        234
      ],
      "segtaxid": 4,
      "cattaxid": 7,
      "contextual_categories": {
        "345": 100,
        "456": 100
      }
    },
    "9999": {
      "segments": [
        12345,
        23456
      ],
      "segtaxid": 550,
      "cattaxid": 551,
      "contextual_categories": {
        "34567": 100,
        "45678": 100
      }
    }
  }
}
```

```javascript
function overrideAppnexus (adUnit, segmentsArray, dataObject, bid) {
    for (var i = 0; i < segmentsArray.length; i++) {
        if (segmentsArray[i]) {
            bid.params.user.segments.push(segmentsArray[i]);
        }
    }
}

pbjs.setConfig({
    // ...
    realTimeData: {
        auctionDelay: 1000,
        dataProviders: [
            {
                name: "SirdataRTDModule",
                waitForIt: true,
                params: {
                    partnerId: 1,
                    key: 1,
                    setGptKeyValues: true,
                    contextualMinRelevancyScore: 50, //Min score to keep contextual category in the bidders (0-100 scale)
                    actualUrl: actual_url, //top location url, for contextual categories
                    bidders: [{
                        bidder: 'appnexus',
                        customFunction: overrideAppnexus,
                        curationId: '111'
                    },{
                        bidder: 'ix',
                        customFunction: function(adUnit, segmentsArray, dataObject, bid) {
                            bid.params.contextual.push(dataObject.contextual_categories);
                        },
                    }]
                }
            }
        ]
    },
    ...
});
```

### Testing

To view an example of available segments returned by Sirdata's backends:

```bash
gulp serve --modules=rtdModule,sirdataRtdProvider,appnexusBidAdapter
```

and then point your browser at:

[http://localhost:9999/integrationExamples/gpt/sirdataRtdProvider_example.html]
