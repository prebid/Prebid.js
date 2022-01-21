# FTrack Real Time Data Submodule

**Module Name:** FTrack Real Time Data Submodule  
**Module Type:** Rtd Provider   
**Maintainer:** [prebid-support@flashtalking.com](mailto:prebid-support@flashtalking.com)

## Description

*The FTrack Identity Framework reat-time data module allows publishers to take advantage of Flashtalking by Mediaocean's FTrack ID during the bidding process.*

**THE ONLY COMPLETE SOLUTION FOR COOKIELESS MEASUREMENT & PERSONALIZATION**

Flashtalking by Mediaocean is the world’s first ad server to function without cookies to orchestrate client identity across buy-side ID spaces for measurement and personalization. With over 120 active global advertisers, our cookieless identity framework is market-ready and includes privacy controls to ensure consumer notification and choice on every impression.

### [FTrack](https://www.flashtalking.com/identity-framework#FTrack)

Flashtalking by Mediaocean’s cookieless tracking technology uses probabilistic device recognition to derive a privacy-friendly persistent ID for each device.

**PROVEN**  
With over 120 brands using FTrack globally, Flashtalking by Mediaocean has accumulated the largest cookieless footprint in the industry.

**ANTI-FINGERPRINTING**  
FTrack operates in strict compliance with [Google’s definition of anti-fingerprinting](https://blog.google/products/ads-commerce/2021-01-privacy-sandbox/). FTrack does not access PII or sensitive information and provides consumers with notification and choice on every impression. We do not participate in the types of activities that most concern privacy advocates (profiling consumers, building audience segments, and/or monetizing consumer data).

**GDPR COMPLIANT**  
Flashtalking by Mediaocean is integrated with the IAB EU’s Transparency & Consent Framework (TCF) and operates on a Consent legal basis where required.  As a Data Processor under GDPR, we do not combine data across customers nor sell data to third parties.

**ACCURATE**  
FTrack’s broad adoption combined with the maturity of the models (6+ years old) gives Flashtalking by Mediaocean the global scale with which to maintain a high degree of model resolution and accuracy.

**DURABLE**  
As new IDs start to proliferate, they will serve as new incremental signals for our models.

Contact [prebid-support@flashtalking.com](mailto:prebid-support@flashtalking.com) for more information.



## FTrack Real Time Data Submodule
This submodule collects or reads FTrack IDs and attaches them as targeting keys to bid requests.

#### Usage
Compile the FTrack RTD module into your Prebid build: `npx gulp build --modules=rtdModule,ftrackRtdProvider`

> Note that the global RTD module, `rtdModule`, is a prerequisite of the FTrack RTD module.

You then need to enable the FTrack RTD in your Prebid configuration, using the below format:

```javascript
pbjs.setConfig({
  ...,
  realTimeData: {
    auctionDelay: 50, // optional auction delay
    dataProviders: [{
      name: 'ftrack-rtd',
      waitForIt: true, // should be true if there's an `auctionDelay`
    }]
  },
  ...
})
```

### Supported Bidders
The FTrack RTD module sets IDs as bidder-specific `ortb2.user.data` first-party data, following the Prebid `ortb2` convention. 


### Parameters
| Name              | Type                 | Description        | Default        |
| ----------------- | -------------------- | ------------------ | ------------------ |
| name              | String               | __Required__ » This should always be `ftrack-rtd` |  |
| waitForIt         | Boolean              | *Optional.* » Should be `true` if there's an `auctionDelay` defined. | `false` |

### The Grid Media Bidder Adapter Support
The The Grid Media Bidder Adapter is setup to work with FTrack Real Time Data submodule!

1) Compile the module and include the Grid Bid Adapter: `npx gulp build --modules=rtdModule,ftrackRtdProvider,gridBidAdapter`  
2) If everything worked correctly, you should now see an `ft_id` in the data sent to The MediaGrid! See example below.


```json
POST https://grid.bidswitch.net/hbjson
```

In the POST payload body, you should see a 'user' property with the following schema 
where 'abcd1234' is the actual ID assigned to the current user.

```json
"user": {
    "data": [{
        "name": "flashtalking",
        "segment": [{
            "name": "ft_id",
            "value": "abcd1234"
        }]
    }],
    "ext": {
        "device": {
            "language": "browser language information",
            "pxratio": "browser pixel ration information",
            "ua": "browser user agent information",
            "h": "browser height information",
            "w": "browser width information",
            "mimes": "browser mimetype information",
            "plugins": "browser plugin information",
            "platform": "browser platform information",
            "ref": "browser referal information"
        }
    }
}
```


